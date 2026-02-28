import { SAB_SCHEMA } from './types/HeadTracking';
import Worker from './workers/VisionWorker?worker';
import { OBRDecoder } from './audio/OBRDecoder';
import * as THREE from 'three';
import { calculateAudioOrientation } from './utils/OrientationUtils';

export class HeadTrackingService {
    private videoElement: HTMLVideoElement | null = null;
    private worker: Worker | null = null;
    public sab: SharedArrayBuffer | null = null;
    private isTracking: boolean = false;
    private animationFrameId: number = 0;
    private obrDecoder: OBRDecoder | null = null;
    private sabFloat32: Float32Array | null = null;
    private sabInt32: Int32Array | null = null;
    private sequenceNumber: number = 0;

    // Temporary Three.js objects for Euler/Yaw inversion to avoid GC in loop
    private tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    private audioQuat = new THREE.Quaternion();

    constructor() { }

    public async init(decoder?: OBRDecoder): Promise<void> {
        console.log("[Main] HeadTrackingService.init() called", { hasDecoder: !!decoder });
        this.obrDecoder = decoder || null;

        // 1. Define SAB Schema memory allocation
        this.sab = new SharedArrayBuffer(SAB_SCHEMA.BYTE_LENGTH);
        this.sabInt32 = new Int32Array(this.sab);
        this.sabFloat32 = new Float32Array(this.sab);

        // Initialize with identity quaternions
        this.sabFloat32[SAB_SCHEMA.QUAT_RAW_W] = 1.0;
        this.sabFloat32[SAB_SCHEMA.QUAT_PRED_W] = 1.0;
        this.sabFloat32[SAB_SCHEMA.QUAT_UI_W] = 1.0;

        console.log("[Main] Allocated SAB:", this.sab.byteLength, "bytes");

        // 2. Instantiate Vision Worker
        this.worker = new Worker();
        console.log("[Main] Vision Worker instantiated");

        // Pass SAB to Worker explicitly
        this.worker.postMessage({
            type: 'INIT_WORKER',
            payload: { sab: this.sab }
        });

        // Optional: Attach SAB directly to the AudioWorklet if an OBRDecoder handles it,
        // Wait! We will need to inject the SAB into the AudioWorklet using postMessage.
        if (this.obrDecoder && this.obrDecoder['workletNode']) {
            console.log("[Main] Attaching SAB to existing AudioWorklet");
            this.obrDecoder['workletNode'].port.postMessage({ type: 'SET_SAB', payload: this.sab });
        } else {
            console.log("[Main] No OBRDecoder workletNode available during init");
        }
    }

    public attachDecoder(decoder: OBRDecoder) {
        console.log("[Main] attachDecoder() called");
        this.obrDecoder = decoder;
        if (this.sab && this.obrDecoder['workletNode']) {
            console.log("[Main] Sending SET_SAB to AudioWorklet port");
            this.obrDecoder['workletNode'].port.postMessage({ type: 'SET_SAB', payload: this.sab });
        } else {
            console.error("[Main] Cannot attach SAB: sab or workletNode is missing", { sab: !!this.sab, node: !!this.obrDecoder?.['workletNode'] });
        }
    }

    /**
     * Updates the UI-driven rotation (Manual camera interaction)
     * Writes directly to the SharedArrayBuffer for low-latency delivery to AudioWorklet
     */
    public setUIRotation(q: THREE.Quaternion) {
        if (!this.sabFloat32 || !this.sabInt32) return;

        // Write UI Quaternion
        this.sabFloat32[SAB_SCHEMA.QUAT_UI_X] = q.x;
        this.sabFloat32[SAB_SCHEMA.QUAT_UI_Y] = q.y;
        this.sabFloat32[SAB_SCHEMA.QUAT_UI_Z] = q.z;
        this.sabFloat32[SAB_SCHEMA.QUAT_UI_W] = q.w;

        // --- Audio Path Yaw Decoupling (Phase 2) ---
        // 1. Calculate audio orientation using utility (no new allocations)
        calculateAudioOrientation(q, this.audioQuat, this.tempEuler);

        // 2. Write to Audio UI SAB indices
        this.sabFloat32[SAB_SCHEMA.QUAT_ADUI_X] = this.audioQuat.x;
        this.sabFloat32[SAB_SCHEMA.QUAT_ADUI_Y] = this.audioQuat.y;
        this.sabFloat32[SAB_SCHEMA.QUAT_ADUI_Z] = this.audioQuat.z;
        this.sabFloat32[SAB_SCHEMA.QUAT_ADUI_W] = this.audioQuat.w;

        // Increment sequence and store atomically to signal update to the worklet
        this.sequenceNumber++;
        Atomics.store(this.sabInt32, SAB_SCHEMA.SEQ_NUM, this.sequenceNumber);
    }

    public async startCamera(): Promise<void> {
        console.log("[Main] startCamera() called");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("[Main] getUserMedia not supported");
            throw new Error('getUserMedia not supported in this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, frameRate: 30 }
        });
        console.log("[Main] Camera stream acquired");

        this.videoElement = document.createElement('video');
        this.videoElement.srcObject = stream;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
        await this.videoElement.play();
        console.log("[Main] Video element playing");

        this.isTracking = true;

        if (this.worker) {
            this.worker.postMessage({ type: 'START_TRACKING' });
        }

        this.captureFrameLoop();
    }

    private lastFrameTime = 0;

    private async captureFrameLoop() {
        if (!this.isTracking || !this.videoElement || !this.worker) return;

        const now = performance.now();
        // Throttle to ~30fps (33ms) to prevent worker message queue from backing up
        if (this.videoElement.readyState >= 2 && (now - this.lastFrameTime) >= 33) {
            this.lastFrameTime = now;
            try {
                // The most performant way to transfer video to a worker is via createImageBitmap
                const bitmap = await createImageBitmap(this.videoElement);
                this.worker.postMessage({
                    type: 'PROCESS_FRAME',
                    payload: { bitmap, timestamp: now }
                }, [bitmap]);
            } catch (e) {
                console.error("[Main] Failed to capture frame:", e);
            }
        }

        this.animationFrameId = requestAnimationFrame(() => this.captureFrameLoop());
    }

    public stopCamera(): void {
        this.isTracking = false;
        cancelAnimationFrame(this.animationFrameId);

        if (this.videoElement && this.videoElement.srcObject) {
            const stream = this.videoElement.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }

        if (this.worker) {
            this.worker.postMessage({ type: 'STOP_TRACKING' });
        }
    }

    /**
     * Send updated ESKF tuning parameters to the Vision Worker.
     * Non-blocking — the worker applies them on its next message loop iteration.
     */
    public updateESKFParams(params: { tau?: number; R_scalar?: number; Q_scalar?: number }) {
        if (this.worker) {
            this.worker.postMessage({ type: 'UPDATE_ESKF_PARAMS', payload: params });
        }
    }

    /** Read the raw MediaPipe quaternion from the SAB (for ghost rendering) */
    public getRawQuaternion(): THREE.Quaternion | null {
        if (!this.sabFloat32) return null;
        return new THREE.Quaternion(
            this.sabFloat32[SAB_SCHEMA.QUAT_RAW_X],
            this.sabFloat32[SAB_SCHEMA.QUAT_RAW_Y],
            this.sabFloat32[SAB_SCHEMA.QUAT_RAW_Z],
            this.sabFloat32[SAB_SCHEMA.QUAT_RAW_W],
        );
    }

    /** Read the ESKF predicted quaternion from the SAB */
    public getPredictedQuaternion(): THREE.Quaternion | null {
        if (!this.sabFloat32) return null;
        return new THREE.Quaternion(
            this.sabFloat32[SAB_SCHEMA.QUAT_PRED_X],
            this.sabFloat32[SAB_SCHEMA.QUAT_PRED_Y],
            this.sabFloat32[SAB_SCHEMA.QUAT_PRED_Z],
            this.sabFloat32[SAB_SCHEMA.QUAT_PRED_W],
        );
    }
}
