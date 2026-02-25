# PROJECT_STATE (2026-02-25)

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
|  ├── vite.svg
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
|  |  ├── HeadTracking.ts
|  |  └── ambisonics.d.ts
|  ├── tracking
|  |  ├── ESKF.test.ts
|  |  ├── ESKF.ts
|  |  ├── OneEuroFilter.test.ts
|  |  ├── OneEuroFilter.ts
|  |  ├── QuatPredictor.test.ts
|  |  └── QuatPredictor.ts
|  ├── utils
|  ├── visualizer
|  └── workers
|     └── VisionWorker.ts
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
-   **Predictive Tracking**: Error-State Kalman Filter (ESKF) implementation (PRP #13 Phase 3)
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
    -   Fixed OBR rotation gating and memory mapping.
    -   **PRP #13 Phase 2 (Lightweight Predictive Tracking)**: Complete. Implemented 1 Euro Filter and naive velocity extrapolation.
    -   **PRP #13 Phase 3 (Advanced Predictive Tracking)**: Complete. Implemented 6D Error-State Kalman Filter (ESKF) in tangent space to eliminate overshoot and model inertia.
    -   **feat(audio): Synchronized UI camera rotation (OrbitControls) with the binaural renderer using expanded SAB schema.**

## 4. Recent Changes

-   [Current] - feat(tracking): implement 6D Error-State Kalman Filter (PRP #13 Phase 3) for smooth predictive head tracking
-   adbb8e9 - feat(audio): synchronize UI camera rotation with binaural renderer via SAB bridge (2 hours ago)
-   79d4973 - docs: generate updated project context bundle (22 hours ago)
-   a093263 - docs: update stack to reflect OBR WASM integration (22 hours ago)
-   917bfe8 - feat(net): sanitize network configuration and fix worklet environment (23 hours ago)
-   27d6939 - chore(git): ignore PRPs folder (13 days ago)
-   0608fd5 - chore(init): project genesis and documentation sync (13 days ago)
