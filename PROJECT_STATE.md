# PROJECT_STATE (2026-02-25)

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
