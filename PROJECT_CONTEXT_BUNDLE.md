
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── FAILURE_REPORT_13.md
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── PRPs
|  ├── # 0.md
|  ├── # 1.md
|  ├── # 10.md
|  ├── # 11.md
|  ├── # 12.md
|  ├── # 13.md
|  ├── # 14.md
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
|  |  ├── FileLoader.tsx
|  |  └── HrtfSelector.tsx
|  ├── index.css
|  ├── main.tsx
|  ├── types
|  |  ├── HeadTracking.ts
|  |  └── ambisonics.d.ts
|  ├── utils
|  |  ├── Throttle.test.ts
|  |  ├── Throttle.ts
|  |  ├── debug.ts
|  |  └── remoteLogger.ts
|  ├── visualizer
|  |  ├── AmbiScene.ts
|  |  ├── shaderMath.test.ts
|  |  ├── shaderMath.ts
|  |  └── shaders
|  |     └── ambisonic.ts
|  └── workers
|     └── VisionWorker.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts

directory: 623 file: 2621

ignored: directory (77)


[2K[1G# PROJECT_STATE (2026-02-25)

## 1. Architecture

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── FAILURE_REPORT_13.md
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── PRPs
├── README.md
├── REMOTE_LOGGING.md
├── browser.log
├── build_error.log
├── convert_sofa_to_json.py
├── eslint.config.js
├── index.html
├── inspect_sofa.py
├── package-lock.json
├── package.json
├── pffft.o
├── project_tree.txt
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
|  ├── assets
|  ├── audio
|  ├── components
|  ├── index.css
|  ├── main.tsx
|  ├── types
|  ├── utils
|  ├── visualizer
|  └── workers
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

## 2. Tech Stack

-   **Language**: TypeScript / C++ (WASM)
-   **Framework**: React (Vite)
-   **Graphics**: Three.js (WebGL)
-   **Audio/Tracking**: Web Audio API, Google Open Binaural Renderer (OBR), MediaPipe Tasks Vision (FaceLandmarker)
-   **Build Tool**: Vite

## 3. Status

-   **Phase 1 (Signal Chain)**: Complete. Audio decoding and analysis functional.
-   **Phase 2 (Shader Core)**: Complete.
    -   Spherical Harmonics visualization implemented in GLSL.
    -   Covariance Matrix energy calculation ($P = Y^T C Y$).
    -   OrbitControls and Orientation Labels added.
    -   Gain control refined.
-   **Phase 3 (Raymarching)**: Pending.
-   **Phase 5 (Debugging Infrastructure)**: Completed. Remote logger implemented for browser-to-terminal debugging.
-   **Phase 4 (Head Tracking)**: **Complete**. 
    -   Fixed OBR rotation gating (Enabled `head_tracking_enabled_` in C++).
    -   Resolved SAB/Worklet memory mapping issues (`HEAPU8` fix).
    -   Corrected rotation direction by conjugating quaternions in the Worklet.
    -   **feat(audio): Synchronized UI camera rotation (OrbitControls) with the binaural renderer using expanded SAB schema.**

## 4. Recent Changes

-   [Current] - feat(audio): synchronize UI camera rotation with binaural renderer via SAB bridge
-   6839767 - feat(audio): resolve head tracking audio rotation and sync documentation (1 hour ago)
-   79d4973 - docs: generate updated project context bundle (22 hours ago)
-   a093263 - docs: update stack to reflect OBR WASM integration (22 hours ago)
-   917bfe8 - feat(net): sanitize network configuration and fix worklet environment (23 hours ago)
-   27d6939 - chore(git): ignore PRPs folder (13 days ago)
-   0608fd5 - chore(init): project genesis and documentation sync (13 days ago)
# AmbiViz - Ambisonic Visualization Application

A high-performance web application for visualizing Ambisonic audio fields in real-time using Three.js and the Web Audio API.

## Features

-   **Head-Tracking Spatial Audio**: Real-time 6DOF audio rotation via MediaPipe FaceLandmarker and Google OBR (WASM).
-   **UI Rotation Sync**: Synchronizes visual camera manipulation (OrbitControls) with the binaural audio renderer.
-   **Ambisonic Decoding**: Supports Order 1-3 Ambisonics (ACN/SN3D).
-   **Real-time Visualization**:
    -   **Spherical Harmonics**: Deforms a 3D sphere based on the directional energy of the sound field.
    -   **Covariance Matrix**: Uses Quadratic Form ($Y^T C Y$) for accurate energy estimation.
    -   **Energy Heatmap**: Color-coded visualization of sound intensity.
-   **Interactive Controls**:
    -   **Orbit Controls**: Rotate, Zoom, and Pan the 3D view.
    -   **Gain Slider**: Adjust visualization sensitivity (0.0 - 10.0).
-   **Audio Engine**:
    -   Drag-and-drop file support (`.wav`, `.ambix`).
    -   Binaural monitoring via HRTF.

## Usage

1.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
2.  **Open in Browser**: Navigate to `http://localhost:5173`.
3.  **Load Audio**: Drag and drop a valid Ambisonic file (4, 9, or 16 channels).
4.  **Interact**: Use the mouse to explore the 3D visualization.

## Technical Stack

-   **Frontend**: React + TypeScript + Vite
-   **3D Graphics**: Three.js + Custom GLSL Shaders
-   **Audio**: Web Audio API + Google Open Binaural Renderer (OBR) via WebAssembly
-   **Styling**: CSS (Vanilla)

## Project Structure

```text
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── FAILURE_REPORT_13.md
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── PRPs
├── README.md
├── REMOTE_LOGGING.md
├── public
|  ├── HRTF_default.sofa.json
|  ├── hrtf
|  ├── obr.js
|  ├── obr.wasm
|  └── worklets
├── src
|  ├── App.tsx
|  ├── HeadTrackingService.ts
|  ├── audio
|  ├── components
|  ├── types
|  ├── utils
|  ├── visualizer
|  └── workers
```
