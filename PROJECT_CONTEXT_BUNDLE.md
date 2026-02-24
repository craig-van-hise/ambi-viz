/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── PROJECT_CONTEXT_BUNDLE.md
├── PROJECT_STATE.md
├── PRPs
|  ├── # 0.md
|  ├── # 1.md
|  ├── # 10.md
|  ├── # 11.md
|  ├── # 12.md
|  ├── # 2.md
|  ├── # 3.md
|  ├── # 4.md
|  ├── # 5.md
|  ├── # 6.md
|  ├── # 7.md
|  ├── # 8.md
|  └── # 9.md
├── README.md
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
|  |  ├── MIT_KEMAR_Normal.sofa
|  |  ├── Neumann_KU100_48k.sofa
|  |  └── hrtf_kemar.json
|  ├── obr.js
|  ├── obr.wasm
|  ├── vite.svg
|  └── worklets
|     └── obr-processor.js
├── src
|  ├── App.css
|  ├── App.tsx
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
|  |  └── ambisonics.d.ts
|  ├── utils
|  |  ├── Throttle.test.ts
|  |  └── Throttle.ts
|  └── visualizer
|     ├── AmbiScene.ts
|     ├── shaderMath.test.ts
|     ├── shaderMath.ts
|     └── shaders
|        └── ambisonic.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts

directory: 828 file: 6166

ignored: directory (77)
# PROJECT_STATE (2026-02-12)

## 1. Architecture

```text
src
├── App.css
├── App.tsx
├── assets
│   └── react.svg
├── audio
│   ├── AudioEngine.ts
│   └── RawCoefAnalyser.ts
├── components
│   └── FileLoader.tsx
├── index.css
├── main.tsx
├── types
│   └── ambisonics.d.ts
└── visualizer
    ├── AmbiScene.ts
    └── shaders
        └── ambisonic.ts
```

## 2. Tech Stack

-   **Language**: TypeScript / C++ (WASM)
-   **Framework**: React (Vite)
-   **Graphics**: Three.js (WebGL)
-   **Audio**: Web Audio API, Google Open Binaural Renderer (OBR)
-   **Build Tool**: Vite

## 3. Status

-   **Phase 1 (Signal Chain)**: Complete. Audio decoding and analysis functional.
-   **Phase 2 (Shader Core)**: Complete.
    -   Spherical Harmonics visualization implemented in GLSL.
    -   Covariance Matrix energy calculation ($P = Y^T C Y$).
    -   OrbitControls and Orientation Labels added.
    -   Gain control refined.
-   **Phase 3 (Raymarching)**: Pending.

## 4. Recent Changes

-   Implemented `AmbiScene` with `OrbitControls`.
-   Fixed shader coordinate mapping for correct orientation.
-   Added "Front", "Back", "Left", "Right" labels.
-   Refined Gain control range (0-10).
-   Integrated Google Open Binaural Renderer (OBR) C++ library compiled to WebAssembly.
-   Implemented robust AudioWorklet processor (`obr-processor.js`) using Emscripten.
-   Fixed WASM initialization, memory handoff (SOFA), and Worklet fetch polyfills.

# AmbiViz - Ambisonic Visualization Application

A high-performance web application for visualizing Ambisonic audio fields in real-time using Three.js and the Web Audio API.

## Features

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

-   `src/audio`: Audio processing logic (Engine, Analyser, Decoder).
-   `src/visualizer`: Three.js scene management and shader code.
-   `src/components`: React UI components (FileLoader).
-   `src/types`: TypeScript definitions.

