## Goal
To implement a real-time, low-latency head tracking system for spatial audio manipulation. This relies on using the MediaPipe WebWorker to detect facial landmarks from a webcam feed, translate those to a rotation Quaternion, and pass them via a `SharedArrayBuffer` to an OBR C++ AudioWorklet for dynamic binaural soundfield rotation.

## Current State
The data pipeline is functionally perfect, but **head tracking is not audibly occurring in the playback**.
1. The `VisionWorker` correctly boots in the background, bypasses Vite's ES Module worker restrictions, initializes the MediaPipe `FaceLandmarker`, and processes camera frames.
2. Quaternions (w, x, y, z) are successfully extracted and written atomically to the `SharedArrayBuffer` (`sabFloat32`).
3. The `OBRProcessor` AudioWorklet successfully receives the `SharedArrayBuffer` and uses an atomic read to pull the exact same Quaternions at the correct sequence numbers.
4. The C++ `_obr_set_rotation(w, x, y, z)` function is actively being called by the AudioWorklet on every frame with the updated rotation values.
5. Despite the coordinates arriving cleanly in the C++ layer, the audio output remains entirely static and does not rotate when the user moves their head.

Additionally, a separate error was logged during the AudioWorklet initialization: 
`Uncaught TypeError: Cannot read properties of undefined (reading 'set') at OBRProcessor.handleMessage (obr-processor.js:83:30)` which indicates that `this.wasm.HEAPU8` is undefined when the application attempts to load the `.sofa` HRTF file, though audio playback is still occurring.

## Attempted Fixes
* **Vite WASM Import Polyfill**: Fixed `TypeError: self.import is not a function` by deploying a dual-polyfill workaround: a dynamic `import()` override, alongside a manual `fetch()` and `eval()` of the Emscripten WASM loader to extract `ModuleFactory` into the global scope.
* **Cache Busting**: Renamed the worker script from `HeadTrackingWorker.ts` to `VisionWorker.ts` to permanently break a stale Chrome cache that was suppressing new logic.
* **Missing Frame Trigger**: Identified and fixed a bug in `HeadTrackingService.ts` where `this.worker.postMessage({ type: 'START_TRACKING' });` was never being sent after the webcam booted, causing dropped frames.
* **SAB Index Mapping**: Verified and restored the correct schema index mapping in the AudioWorklet (`qw = sabFloat32[1]`, `qx = sabFloat32[2]`, `qy = sabFloat32[3]`, `qz = sabFloat32[4]`) to guarantee the C++ engine received standard Quaternion format.
* **Logging Validation**: Set up detailed diagnostic mirroring across both threads to prove that `Wrote seqNum X` in the Worker mapped identically to `_obr_set_rotation called seqNum X` in the Worklet.

## Relevant Scripts
* `src/HeadTrackingService.ts`
* `src/workers/VisionWorker.ts`
* `src/audio/obr-processor.ts`
* `public/worklets/obr-processor.js`
* `src/audio/obr_wrapper.cpp`
* `src/types/HeadTracking.ts`
