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
