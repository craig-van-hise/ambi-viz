# AmbiViz Control Tooltips

This document combines all tooltips for the ESKF Tuning and Visualizer Controls.

## Webcam ESKF Tuning

**Tooltip:** Adjusts the Error-State Kalman Filter (ESKF) parameters that fuse webcam tracking data for responsive, low-latency head orientation. Use these settings to balance smoothness against responsiveness.

### τ (Prediction)
**Tooltip:** Offsets system delay. Increase until audio panning feels instantaneous. If the sound field 'rubber-bands' or overshoots when you abruptly stop your head, decrease this value.

### R (Measurement Noise)
**Tooltip:** Trust in the webcam. Lower = faster response but captures more micro-jitter. Higher = smoother but can feel sluggish. Listen for rapid stutters in the audio field; increase until the stutter disappears.

### Q (Process Noise)
**Tooltip:** Trust in head momentum. Lower = assumes smooth, predictable movement. Higher = better tracking for sudden, erratic head whips. Increase if the audio feels like it drags behind your fast turns.

---

## Visualizer Controls

### Zoom
**Tooltip:** Adjusts the camera's field of view and proximity within the 3D ambisonic scene.

### Gain
**Tooltip:** Scales the raw Ambisonic audio energy before it enters the visual ray-marching pipeline.

### Threshold
**Tooltip:** Sets the minimum audio energy required to render a cloud. Increase this to hide background room noise.

### Density
**Tooltip:** Controls the physical thickness and opacity of the volumetric audio clouds.

### Emission
**Tooltip:** Controls the glowing heat and brightness of the volume independently of its thickness.

### Knee (Color)
**Tooltip:** Shifts the color transfer function to prevent loud transient sounds from blowing out the visualizer into solid white.

### Edge Falloff
**Tooltip:** Adjusts the geometric sharpness of the spatial audio lobes. Higher values create tighter, more focused clouds.

### Dissipation
**Tooltip:** Controls how slowly the visual energy fades over time, creating lingering smoke trails that smooth out erratic flickering.
