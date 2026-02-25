# AmbiViz - Ambisonic Visualization Application

A high-performance web application for visualizing Ambisonic audio fields in real-time using Three.js and the Web Audio API.

## Features

-   **Head-Tracking Spatial Audio**: Real-time 6DOF audio rotation via MediaPipe FaceLandmarker and Google OBR (WASM).
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
├── public
|  ├── HRTF_default.sofa.json
|  ├── hrtf
|  ├── obr.js
|  ├── obr.wasm
|  ├── worklets
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
