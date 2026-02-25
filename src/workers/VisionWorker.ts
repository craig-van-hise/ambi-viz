import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { SAB_SCHEMA, type HeadTrackingMessage } from '../types/HeadTracking';
import { mat3, quat } from 'gl-matrix';
import { ESKF, type Quat } from '../tracking/ESKF';

let faceLandmarker: FaceLandmarker | null = null;
let sabInt32: Int32Array | null = null;
let sabFloat32: Float32Array | null = null;
let sequenceNumber = 0;
let isTracking = false;

// We use gl-matrix for robust matrix to quaternion conversion
const m3 = mat3.create();
const q = quat.create();

let processedFramesCount = 0;
let eskf: ESKF | null = null;
let lastTimestamp: number = -1;

async function initWorker(payload: any) {
    console.log("[Worker] initWorker() called");
    const { sab } = payload;
    sabInt32 = new Int32Array(sab);
    sabFloat32 = new Float32Array(sab);

    // Initialize the ESKF prediction pipeline (Phase 3)
    eskf = new ESKF({
        sigmaGyro: 0.5,
        sigmaAccel: 5.0,
        sigmaMeas: 0.05,
        predictionHorizon: 0.045, // 45ms look-ahead
    });
    lastTimestamp = -1;

    console.log("[Worker] Loading MediaPipe Vision Tasks...");

    const wasmLoaderPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.js";
    const wasmBinaryPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/vision_wasm_internal.wasm";

    // IMPORTANT VITE WORKAROUND:
    // 1. Vite Development forces ES Module workers, where `importScripts` is illegal.
    // 2. MediaPipe's own `self.import` loader is broken in ESM.
    // 3. Dynamic `import()` fails to assign `globalThis.ModuleFactory` due to strict ESM isolation.
    // The ultimate fix is to fetch the loader as text and evaluate it directly into the global scope.
    if (typeof (globalThis as any).ModuleFactory === 'undefined') {
        console.log("[Worker] Fetching and evaluating WASM loader manually...");
        const response = await fetch(wasmLoaderPath);
        let code = await response.text();

        // This executes the Emscripten loader in the global scope.
        // Because `new Function` encapsulates `var` declarations, we must explicitly `return` 
        // the Emscripten `ModuleFactory` variable so we can inject it into `globalThis`.
        code += "\nreturn typeof ModuleFactory !== 'undefined' ? ModuleFactory : undefined;";

        const factory = new Function(code)();
        if (factory) {
            (globalThis as any).ModuleFactory = factory;
            console.log("[Worker] Successfully extracted ModuleFactory.");
        } else {
            console.warn("[Worker] Failed to extract ModuleFactory from WASM loader.");
        }
    }

    // DUAL WORKAROUND PART 2:
    // Even though we manually executed the global loader, MediaPipe internally STILL tries 
    // to dynamically import the loader path we pass in `wasmSet`.
    // We must polyfill `self.import` so that this redundant internal call doesn't throw.
    if (typeof (self as any).import === 'undefined') {
        (self as any).import = new Function('url', 'return import(url)');
    }

    const wasmSet = {
        wasmLoaderPath: wasmLoaderPath,
        wasmBinaryPath: wasmBinaryPath
    };

    faceLandmarker = await FaceLandmarker.createFromOptions(wasmSet, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1
    });

    console.log("[Worker] FaceLandmarker ready");
    self.postMessage({ type: 'WORKER_READY' });
}

self.onmessage = async (e: MessageEvent<HeadTrackingMessage>) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT_WORKER':
            await initWorker(payload);
            break;
        case 'PROCESS_FRAME':
            if (!isTracking || !faceLandmarker || !sabInt32 || !sabFloat32) {
                break;
            }

            const { bitmap, timestamp } = payload;
            try {
                const results = faceLandmarker.detectForVideo(bitmap, timestamp);

                if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
                    const matrix = results.facialTransformationMatrixes[0].data;

                    m3[0] = matrix[0]; m3[1] = matrix[1]; m3[2] = matrix[2];
                    m3[3] = matrix[4]; m3[4] = matrix[5]; m3[5] = matrix[6];
                    m3[6] = matrix[8]; m3[7] = matrix[9]; m3[8] = matrix[10];

                    quat.fromMat3(q, m3);
                    quat.normalize(q, q);

                    // Write RAW quaternion to SAB (for debugging / fallback)
                    sabFloat32[SAB_SCHEMA.QUAT_RAW_X] = q[0];
                    sabFloat32[SAB_SCHEMA.QUAT_RAW_Y] = q[1];
                    sabFloat32[SAB_SCHEMA.QUAT_RAW_Z] = q[2];
                    sabFloat32[SAB_SCHEMA.QUAT_RAW_W] = q[3];

                    // Run ESKF prediction pipeline (Phase 3)
                    if (eskf) {
                        const tSec = timestamp / 1000; // ms → s
                        if (lastTimestamp > 0) {
                            const dt = tSec - lastTimestamp;
                            if (dt > 0 && dt < 1.0) { // sanity: skip if >1s gap
                                eskf.predict(dt);
                            }
                        }
                        lastTimestamp = tSec;

                        const rawQuat: Quat = [q[0], q[1], q[2], q[3]];
                        eskf.correct(rawQuat);

                        const predicted = eskf.getPredicted();
                        sabFloat32[SAB_SCHEMA.QUAT_PRED_X] = predicted[0];
                        sabFloat32[SAB_SCHEMA.QUAT_PRED_Y] = predicted[1];
                        sabFloat32[SAB_SCHEMA.QUAT_PRED_Z] = predicted[2];
                        sabFloat32[SAB_SCHEMA.QUAT_PRED_W] = predicted[3];
                    }

                    // Increment sequence number and store atomically
                    sequenceNumber++;
                    Atomics.store(sabInt32, SAB_SCHEMA.SEQ_NUM, sequenceNumber);

                    if (processedFramesCount < 5) {
                        console.log(`[Worker] Wrote seqNum ${sequenceNumber}: raw(w=${q[3].toFixed(3)}, x=${q[0].toFixed(3)}), pred(w=${sabFloat32[SAB_SCHEMA.QUAT_PRED_W].toFixed(3)}, x=${sabFloat32[SAB_SCHEMA.QUAT_PRED_X].toFixed(3)})`);
                    }
                    processedFramesCount++;
                }
            } catch (e) {
                console.error("[Worker] Frame Error:", e);
            } finally {
                bitmap.close();
            }
            break;
        case 'START_TRACKING':
            console.log("[Worker] START_TRACKING received");
            isTracking = true;
            break;
        case 'STOP_TRACKING':
            console.log("[Worker] STOP_TRACKING received");
            isTracking = false;
            break;
        case 'UPDATE_ESKF_PARAMS':
            if (eskf && payload) {
                eskf.setParams(payload);
                console.log("[Worker] ESKF params updated:", payload);
            }
            break;
    }
};
