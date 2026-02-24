
/Users/vv2024/Documents/AI Projects/WebApps/ambi-viz
├── PROJECT_STATE.md
├── README.md
├── convert_sofa_to_json.py
├── eslint.config.js
├── index.html
├── inspect_sofa.py
├── package-lock.json
├── package.json
├── project_tree.txt
├── public
|  ├── HRTF_default.sofa.json
|  ├── hrtf
|  |  ├── MIT_KEMAR_Normal.sofa
|  |  ├── Neumann_KU100_48k.sofa
|  |  └── hrtf_kemar.json
|  └── vite.svg
├── src
|  ├── App.css
|  ├── App.tsx
|  ├── assets
|  |  └── react.svg
|  ├── audio
|  |  ├── AudioEngine.ts
|  |  └── RawCoefAnalyser.ts
|  ├── components
|  |  └── FileLoader.tsx
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

directory: 819 file: 6133

ignored: directory (81)


[2K[1G# PROJECT_STATE (2026-02-12)

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

-   **Language**: TypeScript
-   **Framework**: React (Vite)
-   **Graphics**: Three.js (WebGL)
-   **Audio**: Web Audio API, ambisonics (JSAmbisonics)
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
-   **Audio**: Web Audio API + JSAmbisonics
-   **Styling**: CSS (Vanilla)

## Project Structure

-   `src/audio`: Audio processing logic (Engine, Analyser, Decoder).
-   `src/visualizer`: Three.js scene management and shader code.
-   `src/components`: React UI components (FileLoader).
-   `src/types`: TypeScript definitions.
