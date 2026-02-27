import { OBRDecoder } from './OBRDecoder';
import { RawCoefAnalyser } from './RawCoefAnalyser';

export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'loading' | 'error';

export interface QueueTrack {
    name: string;
    file: File;
    buffer: AudioBuffer | null;
}

export class AudioEngine {
    audioCtx: AudioContext;
    sourceNode: AudioBufferSourceNode | null = null;
    rawAnalyser: RawCoefAnalyser | null = null;
    obrDecoder: OBRDecoder | null = null;
    onStateChange?: (state: PlaybackState) => void;
    order: number = 1;

    // Smoothing state
    smoothedCoeffs: Float32Array;

    // Transport state
    private audioBuffer: AudioBuffer | null = null;
    private _isLooping: boolean = true;
    playbackState: PlaybackState = 'stopped';

    // Queue state
    queue: QueueTrack[] = [];
    currentIndex: number = -1;
    private _graphReady: boolean = false;

    constructor() {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        this.smoothedCoeffs = new Float32Array(16); // Max order 3 (16 channels)
    }

    private setState(state: PlaybackState) {
        this.playbackState = state;
        this.onStateChange?.(state);
    }

    /**
     * Queue one or more files without starting playback.
     * Returns the indices of the added tracks.
     */
    async queueFiles(files: File[]): Promise<number[]> {
        const startIdx = this.queue.length;
        for (const file of files) {
            this.queue.push({ name: file.name, file, buffer: null });
        }
        return Array.from({ length: files.length }, (_, i) => startIdx + i);
    }

    /**
     * Decode and load a specific track from the queue.
     * Does NOT auto-play — call play() explicitly.
     */
    async loadTrack(index: number): Promise<void> {
        if (index < 0 || index >= this.queue.length) return;

        this.setState('loading');
        const track = this.queue[index];
        this.currentIndex = index;

        try {
            // Decode buffer if not already cached
            if (!track.buffer) {
                const arrayBuffer = await track.file.arrayBuffer();
                track.buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            }

            await this.setupGraph(track.buffer);
            this.setState('stopped');
        } catch (error) {
            console.error('AudioEngine: Error loading track:', error);
            this.setState('error');
        }
    }

    /** Legacy single-file load (queues + loads + plays for backward compat) */
    async loadFile(file: File): Promise<void> {
        const indices = await this.queueFiles([file]);
        await this.loadTrack(indices[0]);
        this.play();
    }

    async setupGraph(buffer: AudioBuffer) {
        // 0. Resume context (Modern browser policy)
        await this.audioCtx.resume();

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
            // We use absolute path/relative to public root as handled by vite
            await this.obrDecoder.loadSofa('/hrtf/MIT_KEMAR_Normal.sofa');

            // Connect RawAnalyser -> BinDecoder -> Destination
            this.rawAnalyser.out.connect(this.obrDecoder.in);
            this.obrDecoder.out.connect(this.audioCtx.destination);
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

    /** Start or resume playback */
    async play() {
        if (this.playbackState === 'playing' || this.playbackState === 'error') return;

        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }

        if (!this.sourceNode && this.audioBuffer && this.rawAnalyser) {
            // JIT Source Creation
            this.sourceNode = this.audioCtx.createBufferSource();
            this.sourceNode.buffer = this.audioBuffer;
            this.sourceNode.loop = this._isLooping;
            this.sourceNode.connect(this.rawAnalyser.in);
            this.sourceNode.start();
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
        if (this.audioCtx.state === 'running') {
            this.audioCtx.suspend();
        }
        this.setState('paused');
    }

    /** Stop playback, reset cursor to 0 (recreates source node) */
    stop() {
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch (_) { /* already stopped */ }
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        this.setState('stopped');
    }

    /** Load and play previous track in queue */
    async prev() {
        if (this.queue.length === 0) return;
        this.stop();
        const newIdx = this.currentIndex > 0 ? this.currentIndex - 1 : this.queue.length - 1;
        await this.loadTrack(newIdx);
        this.play();
    }

    /** Load and play next track in queue */
    async next() {
        if (this.queue.length === 0) return;
        this.stop();
        const newIdx = this.currentIndex < this.queue.length - 1 ? this.currentIndex + 1 : 0;
        await this.loadTrack(newIdx);
        this.play();
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
}
