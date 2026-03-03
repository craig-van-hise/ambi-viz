# PROJECT_STATE (2026-03-03)

## 1. Architecture

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── FAILURE_REPORT_13.md
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── PRPs
├── README.md
├── REMOTE_LOGGING.md
├── index.html
├── llms.txt
├── package.json
├── public
|  ├── HRTF_default.sofa.json
|  ├── hrtf
|  ├── obr.js
|  ├── obr.wasm
|  ├── test.wav
|  └── worklets
├── src
|  ├── App.css
|  ├── App.tsx
|  ├── HeadTrackingService.ts
|  ├── Orientation.test.ts
|  ├── audio
|  |  ├── AudioEngine.ts / AudioEngine.test.ts
|  |  ├── OBRDecoder.ts / OBRDecoder.test.ts
|  |  ├── RawCoefAnalyser.ts
|  |  ├── obr-processor.test.ts
|  |  └── obr_wrapper.cpp
|  ├── components
|  |  ├── CameraControlPanel.tsx
|  |  ├── ESKFTuningPanel.tsx
|  |  ├── FileLoader.tsx
|  |  ├── HrtfSelector.tsx
|  |  ├── TrackQueue.tsx
|  |  ├── TransportControls.tsx
|  |  └── VisualizerControls.tsx
|  ├── tracking
|  |  ├── ESKF.ts / ESKF.test.ts
|  |  ├── OneEuroFilter.ts / OneEuroFilter.test.ts
|  |  └── QuatPredictor.ts / QuatPredictor.test.ts
|  ├── types
|  ├── utils
|  ├── visualizer
|  |  ├── AmbiScene.ts / AmbiScene.test.ts
|  |  ├── CameraControl.test.ts
|  |  ├── shaderMath.ts / shaderMath.test.ts
|  |  └── shaders
|  |     ├── ambisonic.ts
|  |     └── sphereDeformation.ts
|  └── workers
|     └── VisionWorker.ts
├── scripts
├── vite.config.ts
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

-   **PRP #0–12**: **Complete** (Genesis, Audio Engine, Rendering, Ambisonics Pipeline).
-   **PRP #13 (Head Tracking & Transport)**: **Complete**.
-   **PRP #14–17 (UI/FOV Refinement)**: **Complete**.
-   **PRP #18–19 (Bidirectional Control)**: **Complete**.
    - Implemented Forward Vector Target Projection for `OrbitControls`.
    - Enabled Roll support by dynamically updating `camera.up`.
    - Synced 3D canvas manipulation back to React UI sliders.
-   **PRP #20 (Singularity Prevention)**: **Complete**.
    - Hard-clamped Pitch to ±89.4° to prevent WebGL matrix collapse/Black Screen.
    - Added strict type coercion for slider inputs.
-   **PRP #21 (Warp Zone Hardening)**: **Complete**.
    - Enforced strict origin lock `(0,0,0)` for Inside View.
    - Projected target exactly 1 unit away to prevent distance=0 singularities.
-   **PRP #22 (Universal UI Sync)**: **Complete**.
    - Moved UI state polling to the main render loop for universal capture (Mouse + Head).
    - Implemented `isDraggingSlider` flag to prevent state-fighting during manual interaction.
-   **PRP #23 (Camera Data Bridge)**: **Complete**.
    - Closed the loop: Webcam → SAB → 3D Camera → UI Sliders.
    - Head tracking now drives both the audio rotation and the visual camera orientation.
-   **PRP #24 (Track Queue Glitch Fix)**: **Complete**.
    - Fixed playback state collision on double-click by enforcing strict `stop() → loadTrack() → play()` teardown.
    - Added `'loading'` guard to prevent rapid-click spam.
-   **PRP #25 (3DOF Orientation Matrix Fix)**: **Complete**.
    - **Phase 1:** Hard origin-lock guard added to `animate()` loop; target spawn corrected to `(0, 0, -1)`.
    - **Phase 2:** Pitch inversion applied end-to-end (tracker → camera, UI feedback round-trip), Roll pipeline activated via `currentRoll` state and `camera.up` math.
    - **Phase 3:** `camera.up.set(-sin(roll), cos(roll), 0)` applied in both UI slider and head-tracking paths; OBR worklet receives pitch-inverted quaternion.
    - All 60 Vitest tests passing (11 test files).
-   **PRP #36 (Stationary World & Orientation Recovery)**: **Complete**.
    - Decoupled Audio orientation from Visual orientation in the SAB bridge.
    - Implemented Yaw inversion for the audio path (Stationary World model).
    - Forked Tracking and UI orientation paths: Visual = Physical movement, Audio = Environmental stability.
    - Optimized transformation logic via `OrientationUtils.ts` (zero-allocation loop).
-   **PRP #43 (Volumetric Ray-Marching Bounding Sphere Intersection Fix)**: **Complete**.
    - Implemented quadratic ray-sphere intersection to fast-forward rays to the volume boundary.
    - Expanded `MAX_STEPS` to 64 and `MAX_DIST` to 30.0 for extreme distance viewing.
-   **PRP #44 (Salvage Legacy Sphere Deformation)**: **Complete**.
    - Isolated and extracted legacy visualization code for analysis.
-   **PRP #45 (Integrate Multi-Mode Visualization Architecture)**: **Complete**.
    - Refactored `AmbiScene.ts` to manage both Volumetric and Sphere Deformation meshes.
    - Implemented UI toggle in `App.tsx` and `VisualizerControls.tsx`.
-   **PRP #46 (Outside Camera Control Activation)**: **Complete**.
    - Enabled manual camera position sliders in the Outside View by removing reactive disablement.
-   **PRP #26 (Visual-Cognitive Alignment)**: **Complete**.
    - Objective: Decouple audio path (raw YPR) from visual path (inverted display), align Green Pointer as gaze indicator, implement cockpit-view roll on `camera.up`.

## 4. Recent Changes (Summary)

-   **Feature**: Enabled manual camera position sliders in the Outside View for expanded manual control.
-   **Feature**: Integrated Multi-Mode Visualization (toggle between Ray-Marching Volumetrics and Legacy Sphere Deformation).
-   **Fix**: Implemented Bounding Sphere Intersection in shaders to fix disappearing visualization at extreme camera distances.
-   **b6cd2cc - feat: Enable camera position sliders by removing the `disabled` prop. (78 minutes ago)**
-   **9371427 - feat: Implement sphere deformation visualization with new GLSL shaders, integrate into `AmbiScene` and `App.tsx`, and add related planning documents. (2 hours ago)**
-   **145b263 - fix: implement bounding sphere intersection to optimize volumetric ray marching and adjust rendering constants. (16 hours ago)**
-   **e749b6b - feat: Implement volumetric ray-marching bounding sphere intersection fix by increasing shader limits and fast-forwarding ray start, documented in PRP #43. (16 hours ago)**
-   **2561b29 - changed UI to get ready for makeover (16 hours ago)**
