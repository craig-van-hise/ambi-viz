# Debug Plan
1. Verify SAB is passed correctly from Main to Worker.
2. Verify SAB is passed correctly from Main to AudioWorklet.
3. Verify Worker extracts FaceLandmarker kinematics and writes to SAB.
4. Verify Worker Atomic seq counters increment.
5. Verify Worklet reads SAB and detects seq counter increments.
6. Verify _obr_set_rotation is called with non-NaN values.
