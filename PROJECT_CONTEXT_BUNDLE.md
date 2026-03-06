### FILE: project_tree.txt


/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── 2026-03-06_REPO_REPORT.md
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── README.md
├── REMOTE_LOGGING.md
├── WOs
|  ├── # 1.md
|  ├── # 2.md
|  ├── # 3.md
|  └── # 4.md
├── browser.log
├── build_error.log
├── eslint.config.js
├── index.html
├── llms.txt
├── package-lock.json
├── package.json
├── project_tree.txt
├── public
|  ├── Virtual Virgin + VV logo card.png
|  ├── ambisonic_audio_queue
|  |  ├── 3rd Order Ambi Clock Test.opus
|  |  ├── A Furiosa (Maxixe)_dry.opus
|  |  ├── Bach Invention no5 in Eb_AmbiX_3O.opus
|  |  ├── Beethoven - String Quartet No 13 in B-flat major - IV Alla danza tedesca.opus
|  |  ├── Final Fantasy Prelude.opus
|  |  ├── Let Me Tell You About My Boat.opus
|  |  ├── Queue order.txt
|  |  ├── SMB 2 Theme.opus
|  |  └── TEST-09-DYN-B-SPIRAL_Order3.opus
|  ├── coi-serviceworker.js
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
|  ├── App.test.tsx
|  ├── App.tsx
|  ├── HeadTrackingService.test.ts
|  ├── HeadTrackingService.ts
|  ├── Orientation.test.ts
|  ├── assets
|  |  └── react.svg
|  ├── audio
|  |  ├── AudioEngine.test.ts
|  |  ├── AudioEngine.ts
|  |  ├── BW64Parser.test.ts
|  |  ├── BW64Parser.ts
|  |  ├── OBRDecoder.test.ts
|  |  ├── OBRDecoder.ts
|  |  ├── RawCoefAnalyser.ts
|  |  ├── obr-processor.test.ts
|  |  └── obr_wrapper.cpp
|  ├── components
|  |  ├── CameraControlPanel.tsx
|  |  ├── ControlSidebar.tsx
|  |  ├── Footer.tsx
|  |  ├── Header.tsx
|  |  ├── HrtfSelector.tsx
|  |  ├── InfoModal.tsx
|  |  ├── MainViewer.tsx
|  |  ├── SettingsModal.tsx
|  |  ├── Tooltip.tsx
|  |  ├── TrackQueue.tsx
|  |  ├── TransportControls.tsx
|  |  └── panels
|  |     ├── CameraControlPanel.tsx
|  |     ├── ESKFTuningPanel.tsx
|  |     ├── ViewAndTrackingPanel.tsx
|  |     └── VisualizerSettingsPanel.tsx
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
|  |  ├── OrientationUtils.ts
|  |  ├── Throttle.test.ts
|  |  ├── Throttle.ts
|  |  ├── debug.ts
|  |  ├── fileUtils.test.ts
|  |  ├── fileUtils.ts
|  |  ├── persistence.ts
|  |  └── remoteLogger.ts
|  ├── visualizer
|  |  ├── AmbiScene.test.ts
|  |  ├── AmbiScene.ts
|  |  ├── CameraControl.test.ts
|  |  ├── shaderMath.test.ts
|  |  ├── shaderMath.ts
|  |  └── shaders
|  |     ├── ambisonic.ts
|  |     ├── arrowShader.ts
|  |     └── sphereDeformation.ts
|  └── workers
|     └── VisionWorker.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts

directory: 1149 file: 7880

ignored: directory (125)


[2K[1G

### FILE: PROJECT_STATE.md

# PROJECT_STATE (2026-03-06)

## 1. Architecture

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── 2026-03-06_REPO_REPORT.md  # Latest codebase analysis
├── PROJECT_STATE.md           # This file (Source of Truth)
├── PRPs/                      # Product Requirements Prompts (Historical Logs)
├── WOs/                       # Work Orders (Active Tasks)
├── src/
│   ├── App.tsx                # Application Entry & Layout
│   ├── HeadTrackingService.ts # Orchestrates MediaPipe & ESKF
│   ├── audio/
│   │   ├── AudioEngine.ts     # Main Audio Graph & Transport
│   │   ├── OBRDecoder.ts      # Google OBR WASM Interface
│   │   ├── BW64Parser.ts      # Native BW64/RIFF Decoding
│   │   └── RawCoefAnalyser.ts # Real-time Ambisonic Coeff Analysis
│   ├── components/            # Modular UI Components
│   │   ├── panels/            # Specialist Control Panels
│   │   │   ├── ESKFTuningPanel.tsx
│   │   │   └── VisualizerSettingsPanel.tsx
│   │   ├── MainViewer.tsx     # Three.js Canvas Container
│   │   ├── ControlSidebar.tsx # Right-side controls hub
│   │   ├── TrackQueue.tsx     # Audio File Management
│   │   └── TransportControls.tsx
│   ├── tracking/
│   │   ├── ESKF.ts           # Error-State Kalman Filter (Tangent Space)
│   │   └── OneEuroFilter.ts   # Jitter Reduction
│   ├── visualizer/
│   │   ├── AmbiScene.ts       # Three.js Scene & Render Loop
│   │   └── shaders/           # GLSL Volumetric & Deformation
│   └── workers/
│       └── VisionWorker.ts    # MediaPipe FaceLandmarker (Off-thread)
└── public/
    ├── hrtf/                  # SOFA files
    ├── worklets/              # OBR Audio Processor
    └── obr.wasm               # Binary renderer
```

## 2. Tech Stack

- **Framework**: React 19 (Vite)
- **Graphics**: Three.js (WebGL) + Custom GLSL Shaders
- **Audio**: Web Audio API + Google Open Binaural Renderer (OBR) WASM
- **Tracking**: MediaPipe Tasks Vision (FaceLandmarker)
- **Filters**: Error-State Kalman Filter (ESKF) for 6DOF prediction, 1-Euro for jitter
- **Styling**: TailwindCSS 4.0
- **Testing**: Vitest + JSDOM

## 3. Current System Capabilities

### 🎧 Audio Pipeline
- **Ambisonic Rendering**: 3DOF spatialization supporting Order 1-3 (ACN/SN3D).
- **Format Support**: Native ingestion of `.wav`, `.ambix`, `.opus`, and `.bw64` (ADM).
- **HRTF Management**: Selection of built-in profiles or custom `.sofa` file uploads.
- **Transport**: Play/Pause/Stop with generation-tracked seeking to prevent state collisions.

### 🎭 Tracking Engine (ESKF)
- **Low Latency**: Off-thread FaceLandmasking (Worker) coupled with forward-prediction (ESKF).
- **Prediction**: 3DOF orientation prediction (τ ≈ 45ms) to compensate for sensor/render lag.
- **Stabilization**: 1-Euro filtering applied to raw landmarks before ESKF correction.
- **Visual Feedback**: Real-time "Predicted" and "Ghost" orientation arrows in the 3D scene.

### 🌑 Visualizer Modes
- **Volumetric Ray-Marching**: Real-time energy field visualization using Quadratic Form ($Y^T C Y$) energy estimation.
- **Sphere Deformation**: Legacy particle-based mode for sound source localization.
- **Optimization**: Bounding Sphere Intersection logic prevents ray-marching "escapes" and improves performance.
- **Inside/Outside View**: Toggle between First-Person "Cockpit" view and Global "God" view.

### 🎛️ Control & Sync
- **Bidirectional Logic**: 3D `OrbitControls` manipulation syncs back to UI sliders and vice-versa.
- **Singularity Lock**: Hard-clamped Pitch (±89.4°) and per-frame Origin Lock `(0,0,0)` to ensure stability.
- **State Persistence**: Gain, HRTF, and ESKF parameters persist via `localStorage`.

## 4. Active Development Focus
- **Refactoring the App Monolith**: (PRP #71 / WO #4) Completing the migration of business logic from `App.tsx` into specialized components (`src/components/`). Ensuring prop-drilling is minimized via clean interfaces while maintaining state synchronization across the new modular architecture.

## 5. Recent Version History (Post-Refactor)
- **2026-03-06**: Completed Splitting of `App.tsx` into modular components (`ControlSidebar`, `MainViewer`, etc.).
- **2026-03-06**: Added native support for BW64 audio parsing.
- **2026-03-05**: Integrated Custom HRTF `.sofa` upload capability.
- **2026-03-04**: Hardened Tracking Engine with 3-axis (YPR) orientation matrix fix.


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
3.  **Load Audio**: Drag and drop Ambisonic files or a folder containing audio (.wav, .ambix, .ogg, .iamf, .opus).
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


