import { SAB_SCHEMA } from './types/HeadTracking';
import Worker from './workers/VisionWorker?worker';
import { OBRDecoder } from './audio/OBRDecoder';

export class HeadTrackingService {
    private videoElement: HTMLVideoElement | null = null;
    private worker: Worker | null = null;
    public sab: SharedArrayBuffer | null = null;
    private isTracking: boolean = false;
    private animationFrameId: number = 0;
    private obrDecoder: OBRDecoder | null = null;

    constructor() { }

    public async init(decoder?: OBRDecoder): Promise<void> {
        console.log("[Main] HeadTrackingService.init() called", { hasDecoder: !!decoder });
        this.obrDecoder = decoder || null;

        // 1. Define SAB Schema memory allocation
        this.sab = new SharedArrayBuffer(SAB_SCHEMA.BYTE_LENGTH);
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

    private async captureFrameLoop() {
        if (!this.isTracking || !this.videoElement || !this.worker) return;

        if (this.videoElement.readyState >= 2) {
            try {
                // The most performant way to transfer video to a worker is via createImageBitmap
                const bitmap = await createImageBitmap(this.videoElement);
                this.worker.postMessage({
                    type: 'PROCESS_FRAME',
                    payload: { bitmap, timestamp: performance.now() }
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
}
