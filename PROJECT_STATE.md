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
