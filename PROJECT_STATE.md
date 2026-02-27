# PROJECT_STATE (2026-02-27)

## 1. Architecture

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── FAILURE_REPORT_13.md
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── PRPs
├── README.md
├── index.html
├── llms.txt
├── package.json
├── public
|  ├── HRTF_default.sofa.json
|  ├── hrtf
|  ├── obr.js
|  ├── obr.wasm
|  └── worklets
├── src
|  ├── App.css
|  ├── App.tsx
|  ├── HeadTrackingService.ts
|  ├── audio
|  ├── components
|  |  ├── CameraControlPanel.tsx
|  |  ├── ESKFTuningPanel.tsx
|  |  ├── TrackQueue.tsx
|  |  └── TransportControls.tsx
|  ├── tracking
|  ├── types
|  ├── utils
|  ├── visualizer
|  |  ├── AmbiScene.ts
|  |  └── CameraControl.test.ts
|  └── workers
└── vitest.config.ts
```


## 2. Tech Stack

-   **Language**: TypeScript / C++ (WASM)
-   **Framework**: React (Vite)
-   **Graphics**: Three.js (WebGL)
-   **Audio/Tracking**: Web Audio API, Google Open Binaural Renderer (OBR), MediaPipe Tasks Vision (FaceLandmarker)
-   **Predictive Tracking**: Error-State Kalman Filter (ESKF) implementation
-   **State Persistence**: LocalStorage for UI settings and filters.

## 3. Status

-   **PRP #13 (Head Tracking & Transport)**: **Complete**.
-   **PRP #14-17 (UI/FOV Refinement)**: **Complete**.
-   **PRP #18-19 (Bidirectional Control)**: **Complete**.
    - Implemented Forward Vector Target Projection for `OrbitControls`.
    - Enabled Roll support by dynamically updating `camera.up`.
    - Synced 3D canvas manipulation back to React UI sliders.
-   **PRP #20 (Singularity Prevention)**: **Complete**.
    - Hard-clamped Pitch to $\pm 89.4^\circ$ to prevent WebGL matrix collapse/Black Screen.
    - Added strict type coercion for slider inputs.
-   **PRP #21 (Warp Zone Hardening)**: **Complete**.
    - Enforced strict origin lock `(0,0,0)` for Inside View.
    - Projected target exactly 1 unit away to prevent distance=0 singularities.
-   **PRP #22 (Universal UI Sync)**: **Complete**.
    - Moved UI state polling to the main render loop for universal capture (Mouse + Head).
    - Implemented `isDraggingSlider` flag to prevent state-fighting during manual interaction.
-   **PRP #23 (Camera Data Bridge)**: **Complete**.
    - Closed the loop: Webcam -> SAB -> 3D Camera -> UI Sliders.
    - Head tracking now drives both the audio rotation and the visual camera orientation.

## 4. Recent Changes (Summary)

-   **Feature (PRP #23)**: Integrated webcam orientation directly into the 3D camera and synced UI feedback.
-   **Improvement (PRP #22)**: Decoupled UI sync from events; implemented throttled polling in render loop.
-   **Fix (PRP #20-21)**: Resolved "Black Screen" and "Warp Zone" crashes via pitch clamping and origin locking.
-   **Feature (PRP #18-19)**: Achieved full bidirectional synchronization between YPR sliders and OrbitControls.
-   c456801 - feat(viz): decouple FOV states, implement zoom slider, and fix transport logic (PRPs #14-17)
-   221fa46 - feat(audio): implement track queue, transport controls, and ESKF tuning (PRP #13 Phase 6)
-   cd7b787 - feat(tracking): implement predictive head tracking (PRP #13 Phases 2 & 3)
-   adbb8e9 - feat(audio): synchronize UI camera rotation with binaural renderer via SAB bridge
