# AmbiViz Project Context Bundle

## FILE: README.md
```markdown
# AmbiViz - Ambisonic Visualization Application

A high-performance web application for visualizing Ambisonic audio fields in real-time using Three.js and the Web Audio API.

## Features

-   **Predictive Head-Tracking (ESKF)**: Low-latency 6DOF audio rotation using an Error-State Kalman Filter in tangent space with visual debugging (ghost/predicted arrows).
-   **Dynamic Tuning**: Real-time ESKF parameter adjustment (τ, R, Q) with descriptive tooltips for latency and jitter management.
-   **Audio Transport & Queue**:
    -   Full playback controls: Play, Pause, Stop, and Loop.
    -   **Track Queue**: Previous/Next navigation with a scrollable track list.
    -   **Advanced Ingestion**: Drag-and-drop individual files or entire folders (recursive scanning).
    -   Keyboard shortcuts: Spacebar for Play/Pause.
-   **State Persistence**: Automatic `localStorage` persistence for Gain, HRTF profile, and ESKF tuning parameters.
-   **Ambisonic Decoding**: Supports Order 1-3 Ambisonics (ACN/SN3D) via Google Open Binaural Renderer (OBR) WASM.
-   **Real-time Visualization**:
    -   **Spherical Harmonics**: Deforms a 3D sphere based on the directional energy of the sound field.
    -   **Covariance Matrix**: Uses Quadratic Form ($Y^T C Y$) for accurate energy estimation.
    -   **Interactive Controls**: Gain slider, **Inside View Zoom slider**, View Mode toggle (Inside/Outside), and Camera Tracking toggle.

## Usage

1.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
2.  **Open in Browser**: Navigate to `http://localhost:5173`.
3.  **Load Audio**: Drag and drop Ambisonic files or a folder containing audio (.wav, .ambix, .ogg, .iamf).
4.  **Transport**: Use the transport bar or press `Space` to control playback. Double-click tracks in the queue to select.
5.  **Tuning**: Enable "Tracking" to reveal the ESKF Tuning Panel and visual tracking indicators.

## Technical Stack

-   **Frontend**: React + TypeScript + Vite
-   **3D Graphics**: Three.js + Custom GLSL Shaders
-   **Audio**: Web Audio API + OBR WASM + AudioWorklet
-   **Tracking**: MediaPipe Face Landmarker + 6DOF ESKF

## Project Structure

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── PROJECT_STATE.md
├── PRPs
├── README.md
├── public
|  ├── hrtf (SOFA files)
|  ├── worklets (Audio processor)
|  └── obr.wasm
├── src
|  ├── audio (Engine, OBR, Analyser)
|  ├── components (UI, Transport, Queue, Tuning)
|  ├── tracking (Filters, Predictors, Service)
|  ├── utils (Persistence, Throttle)
|  └── visualizer (Three.js Scene, Shaders)
```

```

## FILE: PROJECT_STATE.md
```markdown
# PROJECT_STATE (2026-02-27)

## 1. Architecture

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── PRPs
├── public
|  ├── hrtf (SOFA files)
|  ├── worklets (Audio processor)
|  └── obr.wasm
├── src
|  ├── audio
|  |  ├── AudioEngine.ts
|  |  └── OBRDecoder.ts
|  ├── components
|  |  ├── ESKFTuningPanel.tsx
|  |  ├── FileLoader.tsx
|  |  ├── TrackQueue.tsx
|  |  └── TransportControls.tsx
|  ├── tracking
|  |  ├── ESKF.ts
|  |  └── OneEuroFilter.ts
|  ├── utils
|  |  ├── persistence.ts
|  |  └── Throttle.ts
|  ├── visualizer
|  |  ├── AmbiScene.ts
|  |  └── shaders
|  └── workers
```


## 2. Tech Stack

-   **Language**: TypeScript / C++ (WASM)
-   **Framework**: React (Vite)
-   **Graphics**: Three.js (WebGL)
-   **Audio/Tracking**: Web Audio API, Google Open Binaural Renderer (OBR), MediaPipe Tasks Vision (FaceLandmarker)
-   **Predictive Tracking**: Error-State Kalman Filter (ESKF) implementation
-   **State Persistence**: LocalStorage for UI settings and filters.

## 3. Status

-   **PRP #13 (Head Tracking & Transport)**: **Complete**. Implemented predictive logic, track queue, and drag-and-drop.
-   **PRP #14 (Hotfix: Asset Initialization)**: **Complete**. Fixed race conditions in WASM/AudioContext startup.
-   **PRP #15 (UI/UX Refinement)**: **Complete**. 
    - Combined Play/Pause toggle.
    - Segmented View Mode control (Inside/Outside).
    - Interior Zoom (Cmd/Ctrl + Scroll) with safe FOV clamping.
    - Double-click track selection.
-   **PRP #16 (Transport & UI Hotfix)**: **Complete**.
    - Fixed auto-play regression on Prev/Next navigation.
    - Fixed button contrast in light/dark modes.
    - Added Zoom Slider for visible FOV control.
-   **PRP #17 (FOV Decoupling)**: **Complete**.
    - Isolated FOV states between Inside and Outside modes to prevent perspective distortion.
    - Implemented TDD verification for camera transitions.

## 4. Recent Changes (Summary)

-   **Hotfix (PRP #17)**: Decoupled camera FOV between view modes; added TDD suite for `AmbiScene`.
-   **Feature (PRP #16)**: Added visible Zoom Slider; synced Cmd+Scroll with UI; fixed transport auto-play logic.
-   **Refactor (PRP #15)**: Unified transport buttons; implemented interior zooming and segmented view controls.
-   221fa46 - feat(audio): implement track queue, transport controls, and ESKF tuning (PRP #13 Phase 6)
-   cd7b787 - feat(tracking): implement predictive head tracking (PRP #13 Phases 2 & 3)
-   adbb8e9 - feat(audio): synchronize UI camera rotation with binaural renderer via SAB bridge
-   6839767 - feat(audio): resolve head tracking audio rotation and sync documentation

```

## FILE: llms.txt
```
# Documentation Map
This is the knowledge base for AmbiViz.

- [README.md](./README.md): High-level project description, tech stack, and usage instructions.
- [PROJECT_STATE.md](./PROJECT_STATE.md): Current architecture, tech stack, phase status, and recent Git changes.
- [PRP Tracking](./PRPs/): Chronological record of technical requirements and implementation phases.
- [AmbiScene Logic](./src/visualizer/AmbiScene.ts): Core 3D engine logic including FOV decoupling and zoom mechanics.

```

## FILE: src/App.tsx
```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { FileLoader } from './components/FileLoader';
import { HrtfSelector } from './components/HrtfSelector';
import { ESKFTuningPanel } from './components/ESKFTuningPanel';
import { TransportControls } from './components/TransportControls';
import { TrackQueue } from './components/TrackQueue';
import { AudioEngine } from './audio/AudioEngine';
import type { PlaybackState, QueueTrack } from './audio/AudioEngine';
import { AmbiScene } from './visualizer/AmbiScene';
import type { ViewMode } from './visualizer/AmbiScene';
import { Throttle } from './utils/Throttle';
import { HeadTrackingService } from './HeadTrackingService';
import { loadState, debouncedSave } from './utils/persistence';
import type { PersistedState } from './utils/persistence';

function App() {
  // Load persisted state on mount
  const [persisted] = useState(() => loadState());

  const [audioEngine] = useState(() => new AudioEngine());
  const [headTracking] = useState(() => new HeadTrackingService());
  const [isTrackingCam, setIsTrackingCam] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AmbiScene | null>(null);
  const [gain, setGain] = useState(persisted.gain);
  const [viewMode, setViewMode] = useState<ViewMode>('inside');

  // Transport state
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [isLooping, setIsLooping] = useState(true);
  const [zoomFov, setZoomFov] = useState(75); // Default FOV

  // Queue state
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // ESKF params (persisted)
  const [eskfParams, setEskfParams] = useState(persisted.eskf);
  const [hrtfUrl, setHrtfUrl] = useState(persisted.hrtfUrl);

  // Throttle covariance updates to ~24fps (render stays at 60fps)
  const throttleRef = useRef(new Throttle(24));

  // Persist state on any change
  const persistRef = useRef<PersistedState>(persisted);

  const persistState = useCallback((partial: Partial<PersistedState>) => {
    persistRef.current = { ...persistRef.current, ...partial };
    debouncedSave(persistRef.current);
  }, []);

  useEffect(() => {
    headTracking.init();
  }, [headTracking]);

  // Sync engine state to React
  useEffect(() => {
    audioEngine.onStateChange = (state) => {
      setPlaybackState(state);
    };

    return () => {
      audioEngine.onStateChange = undefined;
    };
  }, [audioEngine]);

  // Apply persisted HRTF on first load
  useEffect(() => {
    if (audioEngine.obrDecoder && hrtfUrl !== '/hrtf/MIT_KEMAR_Normal.sofa') {
      audioEngine.obrDecoder.loadSofa(hrtfUrl).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEngine.obrDecoder]);

  // ── File Queue Handler ──
  const handleFilesQueued = useCallback(async (files: File[]) => {
    const indices = await audioEngine.queueFiles(files);
    setQueue([...audioEngine.queue]);

    // Auto-load first track if nothing is loaded yet (but do NOT play)
    if (audioEngine.currentIndex === -1 && indices.length > 0) {
      await audioEngine.loadTrack(indices[0]);
      setCurrentIndex(indices[0]);
      if (audioEngine.obrDecoder) {
        headTracking.attachDecoder(audioEngine.obrDecoder);
      }
    }
  }, [audioEngine, headTracking]);

  const handleTrackSelect = useCallback(async (index: number) => {
    await audioEngine.loadTrack(index);
    if (audioEngine.playbackState !== 'error') {
      audioEngine.play();
    }
    setCurrentIndex(index);
  }, [audioEngine]);

  const handleHrtfSelect = useCallback(async (url: string) => {
    setHrtfUrl(url);
    persistState({ hrtfUrl: url });
    if (audioEngine.obrDecoder) {
      try {
        await audioEngine.obrDecoder.loadSofa(url);
      } catch (e) {
        console.error('Error changing HRTF:', e);
      }
    }
  }, [audioEngine, persistState]);

  const handleESKFParams = useCallback((params: { tau?: number; R_scalar?: number; Q_scalar?: number }) => {
    headTracking.updateESKFParams(params);
    setEskfParams(prev => {
      const updated = { ...prev, ...params };
      persistState({ eskf: updated });
      return updated;
    });
  }, [headTracking, persistState]);

  const handleGainChange = useCallback((newGain: number) => {
    setGain(newGain);
    persistState({ gain: newGain });
  }, [persistState]);

  const handleZoomChange = useCallback((newFov: number) => {
    setZoomFov(newFov);
    if (sceneRef.current) {
      sceneRef.current.setFov(newFov);
    }
  }, []);



  // ── Transport Handlers ──
  const handlePlay = useCallback(() => {
    audioEngine.play();
  }, [audioEngine]);

  const handlePause = useCallback(() => {
    audioEngine.pause();
  }, [audioEngine]);

  const handleStop = useCallback(() => {
    audioEngine.stop();
  }, [audioEngine]);

  const handlePrev = useCallback(async () => {
    await audioEngine.prev();
    setCurrentIndex(audioEngine.currentIndex);
  }, [audioEngine]);

  const handleNext = useCallback(async () => {
    await audioEngine.next();
    setCurrentIndex(audioEngine.currentIndex);
  }, [audioEngine]);

  const handleLoopToggle = useCallback(() => {
    const newLoop = !isLooping;
    audioEngine.setLoop(newLoop);
    setIsLooping(newLoop);
  }, [audioEngine, isLooping]);

  // ── Spacebar Play/Pause ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (audioEngine.playbackState === 'playing') {
          handlePause();
        } else {
          handlePlay();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioEngine, handlePlay, handlePause]);

  // Initialize 3D Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new AmbiScene(containerRef.current, 0.6);
    sceneRef.current = scene;

    // Sync FOV state from visualizer to React
    scene.onFovChange = (fov) => {
      setZoomFov(fov);
    };

    return () => {
      scene.destroy();
    };
  }, []);

  // Toggle tracking indicators when tracking state changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTrackingIndicatorsVisible(isTrackingCam);
    }
  }, [isTrackingCam]);

  // Update Loop — render at 60fps, data at ~24fps
  useEffect(() => {
    let outputAnimationFrameId: number;

    const loop = () => {
      const now = performance.now();

      if (throttleRef.current.shouldUpdate(now)) {
        audioEngine.update();

        const cov = audioEngine.getCovariance();
        if (sceneRef.current) {
          sceneRef.current.updateCovariance(cov, audioEngine.order, gain);
          headTracking.setUIRotation(sceneRef.current.camera.quaternion);
        }
      }

      if (isTrackingCam && sceneRef.current) {
        const rawQ = headTracking.getRawQuaternion();
        const predQ = headTracking.getPredictedQuaternion();
        if (rawQ && predQ) {
          sceneRef.current.updateTrackingIndicators(rawQ, predQ);
        }
      }

      outputAnimationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(outputAnimationFrameId);
  }, [audioEngine, gain, isTrackingCam, headTracking]);

  const hasQueue = queue.length > 0;

  return (
    <div className="container">
      <h1>AmbiViz</h1>
      <div style={{ marginBottom: '20px' }}>
        <FileLoader onFilesQueued={handleFilesQueued} />
        <HrtfSelector onSelect={handleHrtfSelect} />
      </div>

      {hasQueue && (
        <>
          <TrackQueue
            tracks={queue}
            currentIndex={currentIndex}
            onTrackSelect={handleTrackSelect}
          />
          <TransportControls
            playbackState={playbackState}
            isLooping={isLooping}
            queueSize={queue.length}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onLoopToggle={handleLoopToggle}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </>
      )}

      <div className="viz-container">
        <h3>Spherical Harmonics Visualization (Order 3)</h3>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            aspectRatio: '2.35 / 1',
            border: '1px solid #333',
            background: '#000',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        />
        <div style={{ marginTop: '10px', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Status: {playbackState === 'playing' ? 'Playing' : playbackState === 'paused' ? 'Paused' : 'Stopped'} | Order: {audioEngine.order}</span>
          <label>
            Gain:
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={gain}
              onChange={(e) => handleGainChange(parseFloat(e.target.value))}
              style={{ marginLeft: '10px', verticalAlign: 'middle' }}
            />
            <span style={{ marginLeft: '5px' }}>{gain.toFixed(1)}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9em', color: '#000' }}>
            Zoom:
            <input
              type="range"
              min="20"
              max="160"
              step="1"
              value={zoomFov}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              style={{ marginLeft: '10px', verticalAlign: 'middle' }}
              disabled={viewMode !== 'inside'}
            />
            <span style={{ marginLeft: '5px', width: '3ch', color: '#000' }}>{Math.round(zoomFov)}°</span>
          </label>
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'inside' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('inside');
                if (sceneRef.current) sceneRef.current.setViewMode('inside');
              }}
            >
              👁 Inside
            </button>
            <button
              className={`view-mode-btn outside ${viewMode === 'outside' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('outside');
                if (sceneRef.current) sceneRef.current.setViewMode('outside');
              }}
            >
              🔭 Outside
            </button>
          </div>
          <button
            onClick={() => {
              if (isTrackingCam) {
                headTracking.stopCamera();
                setIsTrackingCam(false);
              } else {
                headTracking.startCamera().then(() => setIsTrackingCam(true));
              }
            }}
            style={{
              padding: '6px 16px',
              background: isTrackingCam ? '#4CAF50' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85em',
              fontWeight: 'bold',
            }}
          >
            {isTrackingCam ? '📹 Tracking ON' : '📹 Start Tracking'}
          </button>
        </div>
      </div>

      {isTrackingCam && (
        <ESKFTuningPanel
          onParamsChange={handleESKFParams}
          initialParams={eskfParams}
        />
      )}

      <div style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
        <p><strong>Instructions:</strong> Drag and drop audio files or folders. Press <kbd>Space</kbd> to play/pause.</p>
        <p><strong>Controls:</strong> {viewMode === 'inside'
          ? 'Click and drag to look around (3DoF head rotation).'
          : 'Click and drag to orbit. Scroll to zoom. Right-click to pan.'
        }</p>
      </div>
    </div>
  );
}

export default App;

```

## FILE: src/audio/AudioEngine.ts
```typescript
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

```

## FILE: src/visualizer/AmbiScene.ts
```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ambisonicVertexShader, ambisonicFragmentShader } from './shaders/ambisonic';

export type ViewMode = 'inside' | 'outside';

export class AmbiScene {
    container: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    material: THREE.ShaderMaterial;
    mesh: THREE.Mesh;
    controls: OrbitControls;

    // Resolution scaling
    renderTarget: THREE.WebGLRenderTarget | null = null;
    compositeMaterial: THREE.ShaderMaterial | null = null;
    compositeScene: THREE.Scene | null = null;
    compositeCamera: THREE.OrthographicCamera | null = null;
    resolutionScale: number;

    // View mode
    viewMode: ViewMode = 'inside';
    onFovChange: ((fov: number) => void) | null = null;

    // Animation state
    rafId: number | null = null;
    private readonly DEFAULT_OUTSIDE_FOV = 50;
    private insideFov = 75;

    // Head tracking visual indicators
    private ghostArrow: THREE.ArrowHelper | null = null;      // Raw MediaPipe (cyan, semi-transparent)
    private predictedArrow: THREE.ArrowHelper | null = null;   // ESKF predicted (green, solid)

    constructor(container: HTMLElement, resolutionScale: number = 0.6) {
        this.container = container;
        this.resolutionScale = Math.max(0.25, Math.min(1.0, resolutionScale));

        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000);

        // 2. Renderer — pixel ratio capped at 1.0 for M1 performance
        const canvas = document.createElement('canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(1.0);
        container.appendChild(this.renderer.domElement);

        // 3. Resolution scaling: render volumetric to a smaller target
        this.setupRenderTarget(width, height);

        // 4. Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Default to inside-out view
        this.setViewMode('inside');

        // 5. Shader Material
        this.material = new THREE.ShaderMaterial({
            vertexShader: ambisonicVertexShader,
            fragmentShader: ambisonicFragmentShader,
            uniforms: {
                uCovariance: { value: Array(64).fill(0).map(() => new THREE.Vector4()) },
                uOrder: { value: 1 },
                uGain: { value: 1.0 },
                uOpacity: { value: 1.0 },
            },
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
        });

        // 6. Geometry — BoxGeometry encompassing camera
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);

        // Helpers
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);

        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);

        this.addOrientationLabels();

        // 7. Head tracking indicators (hidden by default)
        this.initTrackingIndicators();

        // 8. Events
        window.addEventListener('resize', this.onResize.bind(this));
        this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        // Start Loop
        this.animate();
    }

    private setupRenderTarget(width: number, height: number) {
        const rtWidth = Math.max(1, Math.floor(width * this.resolutionScale));
        const rtHeight = Math.max(1, Math.floor(height * this.resolutionScale));

        if (this.renderTarget) this.renderTarget.dispose();

        this.renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        });

        // Composite pass: full-screen quad that displays the low-res render target
        if (!this.compositeScene) {
            this.compositeScene = new THREE.Scene();
            this.compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            this.compositeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: this.renderTarget.texture },
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tDiffuse;
                    varying vec2 vUv;
                    void main() {
                        gl_FragColor = texture2D(tDiffuse, vUv);
                    }
                `,
                depthTest: false,
                depthWrite: false,
            });

            const quad = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2),
                this.compositeMaterial
            );
            this.compositeScene.add(quad);
        } else if (this.compositeMaterial) {
            this.compositeMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
        }
    }

    setViewMode(mode: ViewMode) {
        this.viewMode = mode;

        if (mode === 'inside') {
            // Restore inside FOV
            this.camera.fov = this.insideFov;
            // Camera at origin (tiny offset for OrbitControls stability)
            this.camera.position.set(0, 0, 0.001);
            this.controls.target.set(0, 0, 0);
            // 3DoF rotation only — no pan or zoom
            this.controls.enablePan = false;
            this.controls.enableZoom = false;
            this.controls.minDistance = 0;
            this.controls.maxDistance = 0.01;
        } else {
            // Force standard perspective for outside view
            this.camera.fov = this.DEFAULT_OUTSIDE_FOV;
            // Outside view
            this.camera.position.set(0, 0, 2.5);
            this.controls.target.set(0, 0, 0);
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 10;
        }

        this.camera.updateProjectionMatrix();
        this.controls.update();
    }

    createLabel(text: string, position: THREE.Vector3) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0,0,0,0)';
        context.fillRect(0, 0, 256, 64);

        context.fillStyle = 'white';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            transparent: true,
        });
        const sprite = new THREE.Sprite(material);

        sprite.position.copy(position);
        sprite.scale.set(2, 0.5, 1);
        sprite.renderOrder = 100;

        this.scene.add(sprite);
    }

    addOrientationLabels() {
        const dist = 1.5;
        this.createLabel("FRONT", new THREE.Vector3(0, 0, -dist));
        this.createLabel("BACK", new THREE.Vector3(0, 0, dist));
        this.createLabel("LEFT", new THREE.Vector3(-dist, 0, 0));
        this.createLabel("RIGHT", new THREE.Vector3(dist, 0, 0));
        this.createLabel("UP", new THREE.Vector3(0, dist, 0));
    }

    /** Create ghost (raw) and predicted arrow helpers, hidden by default */
    private initTrackingIndicators() {
        const origin = new THREE.Vector3(0, 0, 0);
        const defaultDir = new THREE.Vector3(0, 0, -1);
        const arrowLength = 1.8;
        const headLength = 0.3;
        const headWidth = 0.15;

        // Ghost arrow — semi-transparent cyan (raw MediaPipe data)
        this.ghostArrow = new THREE.ArrowHelper(
            defaultDir, origin, arrowLength, 0x00e5ff, headLength, headWidth
        );
        this.ghostArrow.line.material = new THREE.LineBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.35,
        });
        (this.ghostArrow.cone.material as THREE.MeshBasicMaterial).transparent = true;
        (this.ghostArrow.cone.material as THREE.MeshBasicMaterial).opacity = 0.35;
        this.ghostArrow.visible = false;
        this.scene.add(this.ghostArrow);

        // Predicted arrow — solid green (ESKF output)
        this.predictedArrow = new THREE.ArrowHelper(
            defaultDir, origin, arrowLength, 0x00e676, headLength, headWidth
        );
        this.predictedArrow.visible = false;
        this.scene.add(this.predictedArrow);
    }

    /**
     * Update the tracking indicator arrows with fresh quaternions from the SAB.
     * Called each frame from the main thread when tracking is active.
     */
    updateTrackingIndicators(rawQuat: THREE.Quaternion, predQuat: THREE.Quaternion) {
        const forward = new THREE.Vector3(0, 0, -1);

        if (this.ghostArrow) {
            const rawDir = forward.clone().applyQuaternion(rawQuat);
            this.ghostArrow.setDirection(rawDir);
        }

        if (this.predictedArrow) {
            const predDir = forward.clone().applyQuaternion(predQuat);
            this.predictedArrow.setDirection(predDir);
        }
    }

    /** Show or hide the tracking indicator arrows */
    setTrackingIndicatorsVisible(visible: boolean) {
        if (this.ghostArrow) this.ghostArrow.visible = visible;
        if (this.predictedArrow) this.predictedArrow.visible = visible;
    }

    updateCovariance(cov: Float32Array, order: number, gain: number = 1.0) {
        if (this.material.isShaderMaterial) {
            // Pack flat covariance into 64 Vector4s for the shader
            const vec4Array = this.material.uniforms.uCovariance.value as THREE.Vector4[];
            for (let i = 0; i < 64; i++) {
                const baseIdx = i * 4;
                // Only fill values within the actual covariance matrix bounds
                // The covariance is nCh×nCh, packed row-major
                // Each row of the 16×16 matrix is split across 4 vec4s
                if (baseIdx + 3 < cov.length) {
                    vec4Array[i].set(cov[baseIdx], cov[baseIdx + 1], cov[baseIdx + 2], cov[baseIdx + 3]);
                } else {
                    vec4Array[i].set(0, 0, 0, 0);
                }
            }
            this.material.uniforms.uOrder.value = order;
            this.material.uniforms.uGain.value = gain;
        }
    }

    updateCoefficients(): void {
        // Deprecated — shader uses uCovariance via computeDirectionalEnergy()
    }

    onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Update render target to match new size
        this.setupRenderTarget(width, height);
    }

    onWheel(e: WheelEvent) {
        if (this.viewMode !== 'inside' || (!e.metaKey && !e.ctrlKey)) return;

        e.preventDefault();

        // 1. Calculate target FOV change
        const zoomSpeed = 0.05;
        let targetFov = this.camera.fov + e.deltaY * zoomSpeed;

        // 2. Bounding: Min 20 deg, Max 160 deg Horizontal FOV
        const minFovV = 20;
        const maxFovH = 160; // Degrees
        const maxFovV = 2 * Math.atan(Math.tan(maxFovH * Math.PI / 360) / this.camera.aspect) * (180 / Math.PI);

        // 3. Clamp and apply
        this.setFov(Math.max(minFovV, Math.min(maxFovV, targetFov)));
    }

    setFov(fov: number) {
        this.insideFov = fov;
        if (this.viewMode === 'inside') {
            this.camera.fov = fov;
            this.camera.updateProjectionMatrix();
        }
        if (this.onFovChange) {
            this.onFovChange(fov);
        }
    }

    animate() {
        this.rafId = requestAnimationFrame(this.animate.bind(this));

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderTarget && this.compositeScene && this.compositeCamera) {
            // Pass 1: Render volumetric scene to low-res target
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, this.camera);

            // Pass 2: Composite to full-res canvas
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.compositeScene, this.compositeCamera);
        } else {
            // Fallback: direct render
            this.renderer.render(this.scene, this.camera);
        }
    }

    destroy() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.onResize.bind(this));
        this.renderer.domElement.removeEventListener('wheel', this.onWheel.bind(this));

        this.renderer.dispose();
        if (this.renderTarget) this.renderTarget.dispose();
        if (this.material.dispose) this.material.dispose();
        if (this.compositeMaterial) this.compositeMaterial.dispose();
        if (this.controls) this.controls.dispose();

        this.container.removeChild(this.renderer.domElement);
    }
}

```

## FILE: src/visualizer/AmbiScene.test.ts
```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { AmbiScene } from './AmbiScene';

// Mocking dependencies to avoid WebGL/DOM errors
vi.mock('three', async (importOriginal) => {
    const original = await importOriginal<typeof THREE>();
    return {
        ...original,
        WebGLRenderer: vi.fn().mockImplementation(function () {
            return {
                setSize: vi.fn(),
                setPixelRatio: vi.fn(),
                setRenderTarget: vi.fn(),
                render: vi.fn(),
                dispose: vi.fn(),
                domElement: document.createElement('canvas'),
            };
        }),
    };
});

vi.mock('three/addons/controls/OrbitControls.js', () => ({
    OrbitControls: vi.fn().mockImplementation(function () {
        return {
            update: vi.fn(),
            dispose: vi.fn(),
            target: new THREE.Vector3(),
            enabled: true,
            enableDamping: false,
            dampingFactor: 0,
            enablePan: true,
            enableZoom: true,
            minDistance: 0,
            maxDistance: 1000
        };
    }),
}));

describe('AmbiScene FOV Logic', () => {
    it('should correctly decouple Inside and Outside FOV', () => {
        const container = document.createElement('div');
        // Define dimensions to avoid division by zero
        Object.defineProperty(container, 'clientWidth', { value: 1000 });
        Object.defineProperty(container, 'clientHeight', { value: 500 });

        const scene = new AmbiScene(container);

        // Initial state should be 'inside' with default 75
        expect(scene.viewMode).toBe('inside');
        expect(scene.camera.fov).toBe(75);

        // Update inside FOV
        scene.setFov(120);
        expect(scene.camera.fov).toBe(120);

        // Switch to outside
        const updateProjectionSpy = vi.spyOn(scene.camera, 'updateProjectionMatrix');
        scene.setViewMode('outside');
        expect(scene.viewMode).toBe('outside');
        expect(scene.camera.fov).toBe(50); // DEFAULT_OUTSIDE_FOV
        expect(updateProjectionSpy).toHaveBeenCalled();

        // Set FOV while in outside mode should update internal state but NOT the camera lens
        scene.setFov(140);
        expect(scene.camera.fov).toBe(50); // Still 50

        // Switch back to inside
        scene.setViewMode('inside');
        expect(scene.viewMode).toBe('inside');
        expect(scene.camera.fov).toBe(140); // Restore custom FOV
        expect(updateProjectionSpy).toHaveBeenCalledTimes(2);
    });
});

```

