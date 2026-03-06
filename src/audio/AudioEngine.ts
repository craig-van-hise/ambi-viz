import { OBRDecoder } from './OBRDecoder';
import { RawCoefAnalyser } from './RawCoefAnalyser';
import { BW64Parser } from './BW64Parser';

export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'loading' | 'error';

export interface QueueTrack {
    name: string;
    file?: File;
    url?: string;
    buffer: AudioBuffer | null;
    type?: string;
    duration?: string;
    durationSec?: number;
}

export class AudioEngine {
    audioCtx: AudioContext;
    sourceNode: AudioBufferSourceNode | null = null;
    rawAnalyser: RawCoefAnalyser | null = null;
    obrDecoder: OBRDecoder | null = null;
    onStateChange?: (state: PlaybackState) => void;
    onTrackChange?: (index: number) => void;
    order: number = 1;

    // Smoothing state
    smoothedCoeffs: Float32Array;

    // Transport state
    private audioBuffer: AudioBuffer | null = null;
    private _isLooping: boolean = false;
    playbackState: PlaybackState = 'stopped';

    // Volume control
    private gainNode: GainNode;

    // Load & Seek guards: monotonic counters to invalidate stale callbacks/fetches
    private _sourceGeneration: number = 0;
    private _loadGeneration: number = 0;
    private _loadingIndex: number = -1;
    private _loadingPromise: Promise<boolean> | null = null;

    // Time tracking
    private startTime: number = 0;
    private pausedTime: number = 0;

    // Queue state
    queue: QueueTrack[] = [];
    currentIndex: number = -1;
    private _graphReady: boolean = false;

    constructor() {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        this.gainNode = this.audioCtx.createGain();
        this.smoothedCoeffs = new Float32Array(16); // Max order 3 (16 channels)
    }

    private setState(state: PlaybackState) {
        this.playbackState = state;
        this.onStateChange?.(state);
    }

    /**
     * Queue one or more files/URLs without starting playback.
     * Returns the indices of the added tracks.
     */
    async queueFiles(items: (File | { name: string, url: string, type?: string })[]): Promise<number[]> {
        const startIdx = this.queue.length;
        for (const item of items) {
            if (item instanceof File) {
                this.queue.push({ name: item.name, file: item, buffer: null });
            } else {
                this.queue.push({ name: item.name, url: item.url, type: item.type, buffer: null });
            }
        }
        return Array.from({ length: items.length }, (_, i) => startIdx + i);
    }

    /**
     * Decode and load a specific track from the queue.
     * Does NOT auto-play — call play() explicitly.
     */
    async loadTrack(index: number): Promise<boolean> {
        if (index < 0 || index >= this.queue.length) return false;

        // If already loading this track, return the existing promise
        if (this._loadingIndex === index && this._loadingPromise) {
            return this._loadingPromise;
        }

        const generation = ++this._loadGeneration;
        this._loadingIndex = index;
        this.currentIndex = index;
        this.onTrackChange?.(index);
        this.setState('loading');

        // Stop existing playback immediately when switching tracks
        this.stop(true);

        const track = this.queue[index];

        this._loadingPromise = (async () => {
            try {
                if (!track.buffer) {
                    let arrayBuffer: ArrayBuffer;
                    if (track.file) {
                        arrayBuffer = await track.file.arrayBuffer();
                    } else if (track.url) {
                        console.log(`AudioEngine: Fetching remote track: ${track.url}`);
                        const response = await fetch(track.url);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        arrayBuffer = await response.arrayBuffer();
                    } else {
                        throw new Error('No file or URL source for track');
                    }

                    if (generation !== this._loadGeneration) return false;

                    if (generation !== this._loadGeneration) return false;

                    // Check for BW64 magic bytes
                    if (arrayBuffer.byteLength >= 4) {
                        const view = new DataView(arrayBuffer);
                        const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
                        if (magic === 'BW64') {
                            track.buffer = await BW64Parser.parse(arrayBuffer, this.audioCtx);
                        } else {
                            track.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                        }
                    } else {
                        track.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                    }

                    if (generation !== this._loadGeneration) return false;

                    track.durationSec = track.buffer.duration;
                    const m = Math.floor(track.durationSec / 60);
                    const s = Math.floor(track.durationSec % 60);
                    track.duration = `${m}:${s.toString().padStart(2, '0')}`;

                    if (track.file) {
                        track.type = track.file.type.split('/')[1]?.toUpperCase() || 'AUDIO';
                    } else if (!track.type && track.url) {
                        const ext = track.url.split('.').pop()?.toUpperCase();
                        track.type = ext || 'URL';
                    }
                }

                if (generation !== this._loadGeneration) return false;

                await this.setupGraph(track.buffer);

                if (generation !== this._loadGeneration) return false;

                this.pausedTime = 0;
                this.setState('stopped');
                console.log(`AudioEngine: Track ${index} ("${track.name}") ready.`);
                return true;
            } catch (error) {
                if (generation !== this._loadGeneration) return false;
                console.error('AudioEngine: Error loading track:', error);
                this.setState('error');
                return false;
            } finally {
                if (generation === this._loadGeneration) {
                    this._loadingPromise = null;
                    this._loadingIndex = -1;
                }
            }
        })();

        return this._loadingPromise;
    }

    /** Legacy single-file load (queues + loads + plays for backward compat) */
    async loadFile(file: File): Promise<boolean> {
        const indices = await this.queueFiles([file]);
        const success = await this.loadTrack(indices[0]);
        if (success) {
            this.play();
        }
        return success;
    }

    async setupGraph(buffer: AudioBuffer) {
        // Store buffer for JIT source creation
        this.audioBuffer = buffer;

        // 1. Detect Order
        const nCh = buffer.numberOfChannels;
        if (nCh === 4) this.order = 1;
        else if (nCh === 9) this.order = 2;
        else if (nCh === 16) this.order = 3;
        else {
            console.warn(`Unsupported channel count: ${nCh}. Defaulting to Order 1 (4ch).`);
            this.order = 1;
        }

        // 2. Initialize OBR graph only once
        if (!this._graphReady) {
            this.rawAnalyser = new RawCoefAnalyser(this.audioCtx, this.order);
            this.obrDecoder = new OBRDecoder(this.audioCtx, this.order);
            await this.obrDecoder.init();
            // Prefix with Vite's BASE_URL for proper GitHub Pages subpath routing
            await this.obrDecoder.loadSofa(`${import.meta.env.BASE_URL}hrtf/MIT_KEMAR_Normal.sofa`);

            // Connect RawAnalyser -> BinDecoder -> GainNode -> Destination
            this.rawAnalyser.out.connect(this.obrDecoder.in);
            this.obrDecoder.out.connect(this.gainNode);
            this.gainNode.connect(this.audioCtx.destination);
            this._graphReady = true;
        }

        console.log(`AudioEngine: Track "${this.queue[this.currentIndex]?.name ?? 'unknown'}" loaded (graph ready).`);
    }

    // Removed startFreshSource() strategy for JIT patterns


    update(): Float32Array {
        if (!this.rawAnalyser) return new Float32Array(16);

        // 1. Get raw RMS values for this frame
        const raw = this.rawAnalyser.getCoefficients();

        // 2. Apply Ballistics
        const attack = 0.1;
        const release = 0.9;

        for (let i = 0; i < raw.length; i++) {
            const current = raw[i];
            const prev = this.smoothedCoeffs[i];

            if (current > prev) {
                this.smoothedCoeffs[i] = prev * (1 - attack) + current * attack;
            } else {
                this.smoothedCoeffs[i] = prev + (current - prev) * (current > prev ? attack : (1 - release));
            }
        }

        return this.smoothedCoeffs;
    }

    getCovariance(): Float32Array {
        // Always return 256 floats (16x16 matrix) for the shader
        if (!this.rawAnalyser) return new Float32Array(256);

        const rawCov = this.rawAnalyser.getCovarianceMatrix();
        // Pad to 256 if the order is less than 3
        if (rawCov.length >= 256) return rawCov;
        const padded = new Float32Array(256);
        // Map the nCh×nCh matrix into a 16×16 matrix
        const nCh = (this.order + 1) * (this.order + 1);
        for (let i = 0; i < nCh; i++) {
            for (let j = 0; j < nCh; j++) {
                padded[i * 16 + j] = rawCov[i * nCh + j];
            }
        }
        return padded;
    }

    // ── Transport Controls ──

    getCurrentTime(): number {
        if (this.playbackState === 'playing') {
            const time = this.pausedTime + (this.audioCtx.currentTime - this.startTime);
            if (!this.audioBuffer) return time;

            if (this._isLooping) {
                return time % this.audioBuffer.duration;
            } else {
                return Math.min(time, this.audioBuffer.duration);
            }
        }
        return this.pausedTime;
    }

    getDuration(): number {
        return this.audioBuffer?.duration || 0;
    }

    seek(time: number) {
        if (!this.audioBuffer) return;
        const wasPlaying = this.playbackState === 'playing';
        // Increment generation to invalidate any pending onended callbacks
        this._sourceGeneration++;
        if (this.sourceNode) this.sourceNode.onended = null;
        if (wasPlaying) this.stop(true); // Soft stop preserving pausedTime temporarily
        this.pausedTime = Math.max(0, Math.min(time, this.audioBuffer.duration));
        if (wasPlaying) {
            this.playbackState = 'paused'; // Allow play() to re-enter after soft stop
            this.play();
        }
    }

    /** Start or resume playback */
    async play() {
        if (this.playbackState === 'playing' || this.playbackState === 'error' || this.playbackState === 'loading') return;

        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }

        if (!this.sourceNode && this.audioBuffer && this.rawAnalyser) {
            // JIT Source Creation
            this.sourceNode = this.audioCtx.createBufferSource();
            this.sourceNode.buffer = this.audioBuffer;
            this.sourceNode.loop = this._isLooping;
            this.sourceNode.connect(this.rawAnalyser.in);

            // Start at paused time
            this.sourceNode.start(0, this.pausedTime);
            this.startTime = this.audioCtx.currentTime;

            // Handle native stop (file end).
            // Capture the current generation so stale callbacks from
            // previous seek() cycles are automatically ignored.
            const gen = this._sourceGeneration;
            this.sourceNode.onended = () => {
                if (gen !== this._sourceGeneration) return; // Stale — ignore
                if (this.playbackState === 'playing' && !this._isLooping) {
                    this.stop();
                    if (this.currentIndex < this.queue.length - 1) {
                        this.next(); // Auto advance
                    }
                }
            };
        }

        if (this.sourceNode) {
            this.setState('playing');
        }
    }

    /** Alias for backward compat */
    resume() {
        this.play();
    }

    /** Pause playback (suspend AudioContext — saves CPU) */
    pause() {
        if (this.playbackState !== 'playing') return;
        this.pausedTime += (this.audioCtx.currentTime - this.startTime);

        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch (_) { /* ignore */ }
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        this.setState('paused');
    }

    /** Stop playback, reset cursor to 0 (recreates source node) */
    stop(soft: boolean = false) {
        this._sourceGeneration++; // Invalidate pending onended tasks
        if (this.sourceNode) {
            this.sourceNode.onended = null;
            try { this.sourceNode.stop(); } catch (_) { /* already stopped */ }
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (!soft) {
            this.pausedTime = 0;
            this.setState('stopped');
        }
    }

    /** Load and play previous track in queue */
    async prev() {
        if (this.queue.length === 0) return;
        const newIdx = this.currentIndex > 0 ? this.currentIndex - 1 : this.queue.length - 1;
        await this.playTrack(newIdx);
    }

    /** Remove a track from the queue */
    removeTrack(index: number) {
        if (index < 0 || index >= this.queue.length) return;

        // If we are removing the currently playing track
        if (index === this.currentIndex) {
            this.stop();
            this.queue.splice(index, 1);
            if (this.queue.length === 0) {
                this.currentIndex = -1;
                this.onTrackChange?.(-1);
            } else {
                // Play the next track (which now occupies the same index, or wrap to 0 if we deleted the last item)
                const nextIdx = index < this.queue.length ? index : 0;
                this.loadTrack(nextIdx).then(success => { if (success) this.play() });
            }
        } else {
            // If we are removing a track before the current one, decrement currentIndex to keep it pointing to the right track
            this.queue.splice(index, 1);
            if (index < this.currentIndex) {
                this.currentIndex--;
                this.onTrackChange?.(this.currentIndex);
            }
        }
    }

    /** Clear the entire queue */
    clearQueue() {
        this.stop();
        this.queue = [];
        this.currentIndex = -1;
        this.onTrackChange?.(-1);
    }

    /** Load and play next track in queue */
    async next() {
        if (this.queue.length === 0) return;
        const newIdx = this.currentIndex < this.queue.length - 1 ? this.currentIndex + 1 : 0;
        await this.playTrack(newIdx);
    }

    /** Convenience method to load and play in one go */
    async playTrack(index: number) {
        const success = await this.loadTrack(index);
        if (success) {
            this.play();
        }
    }

    /** Set loop state on the source node */
    setLoop(loop: boolean) {
        this._isLooping = loop;
        if (this.sourceNode) {
            this.sourceNode.loop = loop;
        }
    }

    /** Get current loop state */
    getLoop(): boolean {
        return this._isLooping;
    }

    /** Set playback volume (0–100 UI range → 0.0–1.0 gain) */
    setVolume(value: number) {
        this.gainNode.gain.value = Math.max(0, Math.min(value / 100, 1));
    }
}
