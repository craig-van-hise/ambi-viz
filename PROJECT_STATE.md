# PROJECT_STATE (2026-02-27)

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
|  |  └── TransportControls.tsx
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
|  |  └── shaders/
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
-   **PRP #26 (Visual-Cognitive Alignment)**: **Pending**.
    - Objective: Decouple audio path (raw YPR) from visual path (inverted display), align Green Pointer as gaze indicator, implement cockpit-view roll on `camera.up`.

## 4. Recent Changes (Summary)

-   **Feature (PRP #25)**: Implemented 3DOF orientation matrix fix — pitch inversion end-to-end (UI, tracker, OBR worklet), Roll via `camera.up` math, and hard origin lock in animate loop.
-   **Fix (PRP #24)**: Resolved track queue double-click playback collision with strict stop/load/play teardown sequence.
-   **Feature (PRP #23)**: Integrated webcam orientation directly into the 3D camera and synced UI feedback.
-   **Improvement (PRP #22)**: Decoupled UI sync from events; implemented throttled polling in render loop.
-   **Fix (PRP #20-21)**: Resolved "Black Screen" and "Warp Zone" crashes via pitch clamping and origin locking.
-   **Feature (PRP #18-19)**: Achieved full bidirectional synchronization between YPR sliders and OrbitControls.
-   7e02716 - feat(viz): implement bidirectional camera control, head tracking bridge, and singularity protection (88 minutes ago)
-   c456801 - feat(viz): decouple FOV states, implement zoom slider, and fix transport logic (PRPs #14-17)
-   221fa46 - feat(audio): implement track queue, transport controls, and ESKF tuning (PRP #13 Phase 6)
-   cd7b787 - feat(tracking): implement predictive head tracking using 1 Euro Filter and 6D ESKF
-   adbb8e9 - feat(audio): synchronize UI camera rotation with binaural renderer via SAB bridge
