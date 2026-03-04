### FILE: project_tree.txt


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
|  ├── # 13.md
|  ├── # 14.md
|  ├── # 15.md
|  ├── # 16.md
|  ├── # 17.md
|  ├── # 18.md
|  ├── # 19.md
|  ├── # 2.md
|  ├── # 20.md
|  ├── # 21.md
|  ├── # 22.md
|  ├── # 23.md
|  ├── # 24.md
|  ├── # 25.md
|  ├── # 26.md
|  ├── # 3.md
|  ├── # 30.md
|  ├── # 31.md
|  ├── # 32.md
|  ├── # 33.md
|  ├── # 34.md
|  ├── # 36.md
|  ├── # 37.md
|  ├── # 38.md
|  ├── # 39.md
|  ├── # 4.md
|  ├── # 40.md
|  ├── # 41.md
|  ├── # 42.md
|  ├── # 43.md
|  ├── # 44.md
|  ├── # 45.md
|  ├── # 5.md
|  ├── # 6.md
|  ├── # 7.md
|  ├── # 8.md
|  ├── # 9.md
|  └── DEBUG_PLAN.md
├── README.md
├── REMOTE_LOGGING.md
├── UI.md
├── ambisonic_OLD.ts
├── baseline_shader_math.md
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
|  ├── obr.js
|  ├── obr.wasm
|  ├── test.wav
|  ├── vite.svg
|  └── worklets
├── scripts
|  └── remote-logger-server.js
├── src
|  ├── App.css
|  ├── App.tsx
|  ├── HeadTrackingService.test.ts
|  ├── HeadTrackingService.ts
|  ├── Orientation.test.ts
|  ├── assets
|  ├── audio
|  ├── components
|  ├── index.css
|  ├── main.tsx
|  ├── tracking
|  ├── types
|  ├── utils
|  ├── visualizer
|  └── workers
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts

directory: 243 file: 87

ignored: directory (2)


[2K[1G

### FILE: PROJECT_STATE.md

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


### FILE: README.md

# AmbiViz - Ambisonic Visualization Application

A high-performance web application for visualizing Ambisonic audio fields in real-time using Three.js and the Web Audio API.

## Features

-   **Predictive Head-Tracking (ESKF)**: Low-latency 6DOF audio rotation using an Error-State Kalman Filter in tangent space with visual debugging (ghost/predicted arrows).
-   **Dynamic Tuning**: Real-time ESKF parameter adjustment (τ, R, Q) with descriptive tooltips for latency and jitter management.
-   **Bidirectional Camera Controls**: 
    -   Integrated **Yaw/Pitch/Roll** sliders that move in real-time to mirror head tracking or manual canvas dragging.
    -   Universal polling system in the render loop ensures smooth, lag-free UI synchronization.
-   **3DOF Orientation Matrix (PRP #25)**:
    -   **Pitch Inversion**: Corrected pitch axis so tilting head up moves the 3D horizon down (non-VR cockpit-view convention).
    -   **Live Roll**: `camera.up.set(-sin(r), cos(r), 0)` applied per-frame to both the visual renderer and OBR worklet, delivering true 3-axis spatial audio.
    -   **Hard Origin Lock**: Inside camera position clamped to `(0,0,0)` every frame to eliminate OrbitControls drift.
-   **Singularity Protection**: 
    -   Aggressive mathematical hardening: Pitch is hard-clamped to prevent WebGL "Black Screen" context crashes.
    -   Origin locking and safe target projection prevent radius explosions and environmental drift in the Inside View.
-   **Audio Transport & Queue**:
    -   Full playback controls: Play, Pause, Stop, and Loop.
    -   **Track Queue**: Previous/Next navigation with a scrollable track list. Double-click a track to switch instantly (strict stop→load→play teardown prevents collision glitches).
    -   **Advanced Ingestion**: Drag-and-drop individual files or entire folders (recursive scanning).
    -   Keyboard shortcuts: Spacebar for Play/Pause.
-   **State Persistence**: Automatic `localStorage` persistence for Gain, HRTF profile, and ESKF tuning parameters.
-   **Ambisonic Decoding**: Supports Order 1-3 Ambisonics (ACN/SN3D) via Google Open Binaural Renderer (OBR) WASM.
-   **Real-time Visualization**:
    -   **Volumetric Ray Marching**: Real-time rendering of the 3D sound field using custom GLSL shaders.
    -   **Covariance Matrix**: Uses Quadratic Form ($Y^T C Y$) for accurate energy estimation (Order 1-3).
    -   **Resolution Scaling (Pass-through Composite)**: High-performance rendering for M1/M2 chips by calculating volumetric density at lower resolution and compositing to a full-res quad.
    -   **Visualization Modes**: Toggle between high-performance **Volumetric Ray Marching** and legacy **Sphere Deformation** visuals in real-time.
    -   **Bounding Sphere Intersection**: Quadratic ray-sphere intersection logic optimizes the ray-marching path, preventing visualization clipping and improving performance at extreme camera distances/angles.
    -   **Interactive Controls**: Gain slider, **Inside View Zoom slider**, manual **Camera Position** sliders (enabled for Outside View), View Mode toggle (Inside/Outside), and Camera Tracking toggle.

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
|  ├── App.tsx / App.css
|  ├── HeadTrackingService.ts
|  ├── audio (Engine, OBR, Analyser, processor)
|  ├── components (UI, Transport, Queue, Tuning, File, HRTF)
|  ├── tracking (ESKF, Filters, Predictors, Service)
|  ├── utils (Persistence, Throttle)
|  ├── visualizer (AmbiScene, Shaders, Tests)
|  └── workers (VisionWorker)
├── scripts
└── vite.config.ts / vitest.config.ts
```


