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
