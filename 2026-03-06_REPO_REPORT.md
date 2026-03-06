# 2026-03-06 REPO REPORT

## Executive Summary
AmbiViz is a high-performance, real-time Ambisonic visualization application. The project has reached a high level of functional maturity, with advanced features like 6DOF ESKF head tracking, bidirectional camera-UI synchronization, and volumetric ray-marching visualization. 

Architecturally, the project is currently in a "Monolith Consolidation" phase. `App.tsx` has grown to ~1400 lines, absorbing the logic of several previously modular components (Track Queue, Transport, ESKF Tuning). While this simplifies state synchronization between tightly coupled systems (Audio Engine, Three.js Scene, Head Tracking), it has left behind several vestigial component files in `src/components/` that are no longer imported or used.

## Detailed Tree & Architecture Explanation

### Core Architecture
The application follows a "Central Hub" pattern centered in `App.tsx`:

1.  **Audio Engine (`src/audio/AudioEngine.ts`)**: Manages the Web Audio API graph, OBR (Open Binaural Renderer) WASM integration, and track queue state.
2.  **Visual Scene (`src/visualizer/AmbiScene.ts`)**: Handles Three.js rendering, including custom GLSL shaders for volumetric and sphere deformation visualization.
3.  **Head Tracking (`HeadTrackingService.ts`)**: Orchestrates MediaPipe Vision Worker and SharedArrayBuffer (SAB) for ultra-low latency orientation data delivery to both the Visual Renderer and the OBR AudioWorklet.
4.  **Tracking Logic (`src/tracking/`)**: Implements the Error-State Kalman Filter (ESKF) and One-Euro filters for predictive, jitter-free orientation.

### Data Flow Logic
-   **Orientation Loop**: `VisionWorker` -> `SAB` -> `HeadTrackingService` -> `AudioWorklet` (Direct) & `App.tsx` (State Notification).
-   **Visualization Loop**: `AudioEngine` -> `RawCoefAnalyser` -> `Covariance Matrix (16x16)` -> `AmbiScene` -> `GLSL Shader`.
-   **UI Sync**: `AmbiScene` (OrbitControls) -> `App.tsx` (via render loop polling) -> UI Sliders.

## Component Interaction Analysis
-   **App.tsx** acts as the primary orchestrator, holding instances of `AudioEngine`, `HeadTrackingService`, and `AmbiScene`.
-   It uses `createPortal` for a custom tooltip system.
-   It handles recursive directory scanning for audio ingestion.
-   It synchronizes viewport mode changes (Inside vs. Outside View) across the visual and audio engines.

## Vestigial File Report

### 🔴 High Confidence (Dead / Reference Code)
-   **`src/components/TrackQueue.tsx`**: The logic for the track queue is now fully implemented inline within `App.tsx`. This file is no longer imported.
-   **`src/components/TransportControls.tsx`**: The transport control logic and UI are now inline in `App.tsx`.
-   **`src/components/ESKFTuningPanel.tsx`**: The tuning panel UI is now handled directly within the `App.tsx` sidebar logic.
-   **`src/components/CameraControlPanel.tsx`**: While the `CameraUIState` interface is imported, the component itself is not used.
-   **`pffft.o`**: An object file (binary) in the root directory. Likely a build artifact from the WASM compilation process that should not be tracked.
-   **`inspect_sofa.py`**: A helper script in the root for SOFA file inspection. Useful for development but not part of the application pipeline.
-   **`convert_sofa_to_json.py`**: A helper script in the root.
-   **`ambisonic_OLD.ts`**: (Previously found in root/history, now moved to `xCleanup`).

### 🟡 Medium Confidence (Review Needed)
-   **`src/utils/remoteLogger.ts` & `scripts/remote-logger-server.js`**: These provide remote logging capabilities. They are active in `main.tsx` but may not be necessary for production deployments unless actively debugging.
-   **`src/audio/obr-processor.test.ts`**: A test file that might be partially redundant with newer integration tests.
-   **`public/HRTF_default.sofa.json`**: Appears to be an empty or placeholder file (14 bytes).

### 🟢 Low Confidence (Likely Useful)
-   **`src/utils/debug.ts`**: Minimal debug utility, kept for future use.
-   **`src/assets/react.svg`**: Default asset, likely used as a placeholder or in the Info modal.
-   **`PROJECT_CONTEXT_BUNDLE.md`**: A generated file used by AI agents for context; helpful for development but can be regenerated.

## Next Recommendations
1.  **Sanitize Components (Pre-requisite)**: Delete the high-confidence vestigial files in `src/components/` (specifically `TrackQueue.tsx`, `TransportControls.tsx`, and `ESKFTuningPanel.tsx`). These must be removed first to clear the workspace and prevent the AI from attempting to merge new logic with legacy code.
2.  **Refactor `App.tsx`**: Extract the currently inline UI components (Track Queue, Transport, Sidebar Panels) out of the `App.tsx` monolith and into fresh, newly created files in `src/components/`. Re-wire the state and imports cleanly.
3.  **Root Directory Cleanup**:
    1.  Move `inspect_sofa.py` and `convert_sofa_to_json.py` from the root directly into the existing `scripts/` directory.
    2.  Delete the `pffft.o` object file from the root.
