# AmbiViz Default Parameters

This document captures the default values for all control parameters in the application. These values are applied when the "Reset" buttons are clicked or when the application is first launched (unless persisted state differs).

## 📹 Webcam ESKF Tuning
- **τ (Prediction)**: 125 ms
- **R (Measurement Noise)**: 0.000938
- **Q (Process Noise)**: 0.25

## 🎨 Visualizer Controls
- **Gain**: 3.0 (Synchronized for both Inside/Outside views upon reset)
- **Zoom (FOV)**: 120°
- **Threshold**: 0.000
- **Density**: 1.0x
- **Emission**: 1.0x
- **Knee (Color)**: 0.50
- **Edge Falloff**: 1.0
- **Dissipation**: 0.00
- **Visualization Mode**: ☁️ Volumetric (Ray Marching)

## 🎥 Camera Position
### Inside View
- **Yaw**: 0°
- **Pitch**: 0°
- **Roll**: 0°

### Outside View
- **X**: 0.0
- **Y**: 3.3
- **Z**: 3.6

## 🔁 Transport & Global
- **Looping**: ON
- **HRTF**: `MIT_KEMAR_Normal.sofa`
- **View Mode**: 👁 Inside View (Origin Lock enabled)
