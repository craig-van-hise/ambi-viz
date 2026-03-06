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
