# AmbiViz UI Overview

This document describes the current structure and elements of the AmbiViz user interface, ordered from top to bottom as they appear on the screen.

## 1. Header Section
- **Title**: "AmbiViz"
- **Subtitle**: "Spherical Harmonics Visualization (up to Order 3)"

## 2. Main Viewer / Drop Zone
- **3D Canvas**: The central area where the volumetric spherical harmonics and 3D scene are rendered.
- **Drag & Drop Functionality**: The entire viewer acts as a drop zone. Dragging files/folders over it triggers a visual highlight and the text: "Drop Audio Files or Folders Here".
- **Overlay Information**: Displays format support information (.wav, .ambix, .ogg, .iamf) during a drag action.

## 3. Track Queue
- **Title**: "Queue (X)" - shows the number of tracks currently loaded.
- **Queue List**: A scrollable vertical list of loaded audio tracks.
- **Empty State**: Displays "No tracks loaded" centered in the queue box when empty.
- **Item Interaction**: Double-clicking a track loads it into the player. Active tracks are highlighted.

## 4. Transport Controls
- **Bar Container**: A sleek, dark, blur-effect container holding the playback buttons.
- **Left-to-Right Buttons**:
  - **Previous (⏮)**: Skips to the previous track.
  - **Play/Pause (▶/⏸)**: Toggles playback state.
  - **Stop (⏹)**: Stops playback and resets the track to the beginning.
  - **Next (⏭)**: Skips to the next track.
  - **Loop Toggle (🔁)**: Toggles looping of the current track (Active = highlighted).
  - **Settings Cog (⚙️)**: Opens the Settings Modal.

## 5. Settings Modal (Popup)
- **Overlay**: A dimmed, blurred background that covers the UI when active.
- **Modal Content**:
  - **Title**: "Settings" with a close (×) button.
  - **HRTF Selector**: A dropdown menu labeled "Select HRTF" to choose the Head-Related Transfer Function (e.g., MIT KEMAR).

## 6. Main Control Row
This row is positioned beneath the transport controls and contains several grouped modules:

### View Mode & Tracking (Left Side)
- **View Mode Toggle**:
  - **👁 Inside**: Locks the camera at the center (3DoF head rotation).
  - **🔭 Outside**: Allows orbiting around the sound field.
- **📹 Start Tracking Button**: Initializes head tracking. Status changes to "📹 Tracking ON" when active.

### Camera Orientation (Center-Left)
- **Title**: "CAMERA ORIENTATION" with a Reset button.
- **Sliders**: Individual sliders for **Yaw**, **Pitch**, and **Roll**.
- **Behavior**: When tracking is ON, these sliders become read-only observers displaying the head tracker's output.

### Visualizer Controls (Center-Right/Right)
- **Title**: "🎨 Visualizer Controls" with a Reset button.
- **Parameters**: Sliders for **Zoom**, **Gain**, **Threshold**, **Density**, **Emission**, **Knee (Color)**, **Edge Falloff**, and **Dissipation**.
- **Tooltips**: Hovering over the labels provides a description of each parameter's effect on the volumetric rendering.

## 7. ESKF Tuning (Bottom)
- **Title**: "⚙️ ESKF TUNING" with a Reset button.
- **Parameters**: Sliders to adjust the Error State Kalman Filter response:
  - **τ (Prediction)**: Adjusts the filter's time constant.
  - **R (Meas. Noise)**: Scales the measurement noise covariance.
  - **Q (Proc. Noise)**: Scales the process noise covariance.

