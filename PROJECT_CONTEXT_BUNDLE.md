
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── FAILURE_REPORT_13.md
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── PRPs
|  ├── # 0.md
|  ├── # 1.md
|  ├── # 10.md
|  ├── # 11.md
|  ├── # 12-1.md
|  ├── # 12.md
|  ├── # 13
|  |  └── # 1.md
|  ├── # 13.md
|  ├── # 2.md
|  ├── # 3.md
|  ├── # 4.md
|  ├── # 5.md
|  ├── # 6.md
|  ├── # 7.md
|  ├── # 8.md
|  ├── # 9.md
|  └── DEBUG_PLAN.md
├── README.md
├── REMOTE_LOGGING.md
├── browser.log
├── build_error.log
├── convert_sofa_to_json.py
├── eslint.config.js
├── index.html
├── inspect_sofa.py
├── llms.txt
├── package-lock.json
├── package.json
├── pffft.o
├── project_tree.txt
├── public
|  ├── HRTF_default.sofa.json
|  ├── hrtf
|  |  ├── MIT_KEMAR_Normal.sofa
|  |  ├── Neumann_KU100_48k.sofa
|  |  └── hrtf_kemar.json
|  ├── obr.js
|  ├── obr.wasm
|  ├── test.wav
|  ├── vite.svg
|  └── worklets
|     └── obr-processor.js
├── scripts
|  └── remote-logger-server.js
├── src
|  ├── App.css
|  ├── App.tsx
|  ├── HeadTrackingService.ts
|  ├── assets
|  |  └── react.svg
|  ├── audio
|  |  ├── AudioEngine.test.ts
|  |  ├── AudioEngine.ts
|  |  ├── OBRDecoder.test.ts
|  |  ├── OBRDecoder.ts
|  |  ├── RawCoefAnalyser.ts
|  |  ├── obr-processor.test.ts
|  |  └── obr_wrapper.cpp
|  ├── components
|  |  ├── ESKFTuningPanel.tsx
|  |  ├── FileLoader.tsx
|  |  ├── HrtfSelector.tsx
|  |  ├── TrackQueue.tsx
|  |  └── TransportControls.tsx
|  ├── index.css
|  ├── main.tsx
|  ├── tracking
|  |  ├── ESKF.test.ts
|  |  ├── ESKF.ts
|  |  ├── OneEuroFilter.test.ts
|  |  ├── OneEuroFilter.ts
|  |  ├── QuatPredictor.test.ts
|  |  └── QuatPredictor.ts
|  ├── types
|  |  ├── HeadTracking.ts
|  |  └── ambisonics.d.ts
|  ├── utils
|  |  ├── Throttle.test.ts
|  |  ├── Throttle.ts
|  |  ├── debug.ts
|  |  ├── persistence.ts
|  |  └── remoteLogger.ts
|  ├── visualizer
|  |  ├── AmbiScene.ts
|  |  ├── shaderMath.test.ts
|  |  ├── shaderMath.ts
|  |  └── shaders
|  └── workers
|     └── VisionWorker.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts

directory: 415 file: 882

ignored: directory (36)


[2K[1G# PROJECT_STATE (2026-02-25)

## 1. Architecture

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── PROJECT_STATE.md
├── README.md
├── PRPs
├── public
|  ├── hrtf (SOFA files)
|  ├── worklets (Audio processor)
|  └── obr.wasm
├── src
|  ├── App.tsx
|  ├── HeadTrackingService.ts
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
|  |  └── AmbiScene.ts
|  └── workers
|     └── VisionWorker.ts
```


## 2. Tech Stack

-   **Language**: TypeScript / C++ (WASM)
-   **Framework**: React (Vite)
-   **Graphics**: Three.js (WebGL)
-   **Audio/Tracking**: Web Audio API, Google Open Binaural Renderer (OBR), MediaPipe Tasks Vision (FaceLandmarker)
-   **Predictive Tracking**: Error-State Kalman Filter (ESKF) implementation (PRP #13 Phase 3)
-   **Build Tool**: Vite

## 3. Status

-   **Phase 1 (Signal Chain)**: Complete. Audio decoding and analysis functional.
-   **Phase 2 (Shader Core)**: Complete.
-   **Phase 4 (Head Tracking - PRP #13)**: **Complete**. 
    -   **Phases 1-3**: Implemented MediaPipe integration, 1 Euro Filter, and 6D Error-State Kalman Filter (ESKF).
    -   **Phase 4 (Tuning & Visual Debug)**: Runtime ESKF parameter modification and ghost/predicted orientation arrows.
    -   **Phase 5 (UX Telemetry)**: Tooltips on tuning sliders for empirical guidance.
    -   **Phase 6 (Queue & Persistence)**: Audio track queue, folder drops, and localStorage state persistence.
-   **feat(audio): Synchronized UI camera rotation (OrbitControls) with the binaural renderer.**

## 4. Recent Changes

-   [Current] - feat(ux): implement audio track queue, folder drops, and localStorage persistence (PRP #13 Phase 6)
-   cd7b787 - feat(tracking): implement predictive head tracking (PRP #13 Phases 2 & 3) using 1 Euro Filter and 6D ESKF
-   adbb8e9 - feat(audio): synchronize UI camera rotation with binaural renderer via SAB bridge
-   6839767 - feat(audio): resolve head tracking audio rotation and sync documentation
-   79d4973 - docs: generate updated project context bundle
-   a093263 - docs: update stack to reflect OBR WASM integration
-   917bfe8 - feat(net): sanitize network configuration and fix worklet environment
-   27d6939 - chore(git): ignore PRPs folder
-   0608fd5 - chore(init): project genesis and documentation sync
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
    -   **Interactive Controls**: Gain slider, View Mode toggle (Inside/Outside), and Camera Tracking toggle.

## Usage

1.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
2.  **Open in Browser**: Navigate to `http://localhost:5173`.
3.  **Load Audio**: Drag and drop Ambisonic files or a folder containing audio (.wav, .ambix, .ogg, .iamf).
4.  **Transport**: Use the transport bar or press `Space` to control playback.
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
