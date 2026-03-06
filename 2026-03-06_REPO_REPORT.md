# 2026-03-06 REPO REPORT

## Executive Summary
AmbiViz is a high-performance, real-time Ambisonic visualization application. The project has reached a high level of functional maturity, featuring advanced 6DOF ESKF head tracking, bidirectional camera-UI synchronization, and multi-mode volumetric ray-marching visualization.

Architecturally, the project is currently in a **"Monolith Consolidation" phase**. The main `App.tsx` has grown to ~1400 lines, having absorbed the logic of several previously modular components (Track Queue, Transport, ESKF Tuning). This shift simplifies state synchronization between the Audio Engine, Three.js Scene, and Head Tracking Service at the cost of component modularity. This report identifies the cleanup progress and remaining vestigial artifacts following this consolidation.

## Changes Since Last Key Report (2026-03-03 Baseline)
Since the `PROJECT_STATE.md` update on 2026-03-03, the repository has undergone a significant "forensic cleanup":

1.  **Component Consolidation**: The following files, previously listed as core components, have been **fully inlined into `App.tsx` and removed from the filesystem**:
    -   `src/components/TrackQueue.tsx`
    -   `src/components/TransportControls.tsx`
    -   `src/components/ESKFTuningPanel.tsx`
    -   `src/components/FileLoader.tsx`
    -   `src/components/VisualizerControls.tsx`
    -   `src/components/CameraControlPanel.tsx`
2.  **Audio Engine Hardening**: Added native support for **BW64** and **Opus** audio files. Fixed transport seek desynchronization and wired volume controls to the gain chain.
3.  **Visualization Enhancements**: Implemented **Bounding Sphere Intersection** in ray-marching shaders to optimize performance and prevent clipping at extreme distances.
4.  **Legacy Purge**: `ambisonic_OLD.ts` and `pffft.o` (binary artifact) have been removed from the root directory.

## Detailed Tree & Architecture Explanation

### Core Architecture
The application follows a **"Central Hub" pattern** centered in `App.tsx`:

1.  **Audio Engine (`src/audio/AudioEngine.ts`)**: Manages the Web Audio API graph, OBR (Open Binaural Renderer) WASM integration, and track queue state.
2.  **Visual Scene (`src/visualizer/AmbiScene.ts`)**: Handles Three.js rendering, including custom GLSL shaders for volumetric and sphere deformation visualization.
3.  **Head Tracking (`HeadTrackingService.ts`)**: Orchestrates MediaPipe Vision Worker and SharedArrayBuffer (SAB) for ultra-low latency orientation data delivery.
4.  **Tracking Logic (`src/tracking/`)**: Implements the Error-State Kalman Filter (ESKF) for predictive, jitter-free orientation.

### Data Flow logic
-   **Orientation Loop**: `VisionWorker` (WebWorker) → `SAB` → `HeadTrackingService` → `AudioWorklet` (Direct) & `App.tsx` (UI polling).
-   **Visualization Loop**: `AudioEngine` → `RawCoefAnalyser` → `Covariance Matrix (16x16)` → `AmbiScene` → `GLSL Shader Uniforms`.
-   **UI Sync**: `AmbiScene` (OrbitControls/Manual) → `App.tsx` (Render loop polling) → UI Sliders.

## Component Interaction Analysis
-   **`App.tsx`** acts as the primary orchestrator, holding instances of the Audio, Tracking, and Visual services.
-   It leverages **Vite BASE_URL** for subpath routing (essential for GitHub Pages).
-   It uses **recursive directory scanning** for audio ingestion.
-   It handles **Bidirectional Camera-UI Sync**: Manual mouse dragging in the canvas updates the React UI sliders in real-time without state-fighting.

## Vestigial File Report

### 🔴 High Confidence (Dead / Reference Code)
-   **`src/utils/debug.ts`**: Contains a single `logDebug` export that is never imported or used. Logic should be migrated to a proper logging service or deleted.
-   **`xCleanup/`**: Currently an empty directory; redundant if the cleanup is managed via Git history.

### 🟡 Medium Confidence (Review Needed)
-   **`src/audio/obr_wrapper.cpp`**: Source for the OBR WASM binder. Essential for builds, but unused by the Vite runtime. Should be moved to a `tools/` or `cpp/` directory.
-   **`src/utils/remoteLogger.ts` & `scripts/remote-logger-server.js`**: Provided for remote debugging. While functional, they are development-only artifacts that should not be included in production builds.
-   **`public/HRTF_default.sofa.json`**: Appears to be a placeholder/empty file.

### 🟢 Low Confidence (Likely Useful)
-   **`src/audio/obr-processor.test.ts`**: A test file that may be redundant with newer integration tests but serves as a useful benchmark for OBR performance.
-   **`PROJECT_CONTEXT_BUNDLE.md`**: A generated context file. Useful for LLM context but should be git-ignored or moved to a documentation folder.

## Next Recommendations
1.  **Refactor App.tsx**: Extract the currently inline UI components (Track Queue, Transport, Sidebar Panels) into fresh, modular files in `src/components/` to reduce the monolith's size.
2.  **Script Organization**: Move `inspect_sofa.py` and `convert_sofa_to_json.py` from the project root into the existing `scripts/` directory.
3.  **Sync Documentation**: Update `PROJECT_STATE.md` to reflect the removal of the consolidated components.
