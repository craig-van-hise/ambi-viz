import ModuleFactory from '../obr.js';

// --- EMSCRIPTEN WORKLET POLYFILLS ---
if (typeof globalThis.URL === 'undefined') {
    globalThis.URL = class URL {
        constructor(url, base) { this.href = url; }
        toString() { return this.href; }
    };
}
if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
    globalThis.document = { baseURI: 'http://localhost/' };
}
// ------------------------------------

class OBRProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const { order, sampleRate } = options.processorOptions || {};
        this.order = order || 1;
        this.sampleRate = sampleRate || 48000;
        this.numChannels = (this.order + 1) ** 2;

        this.ready = false;
        this.wasm = null;
        this.inputPtr = null;
        this.outputPtr = null;
        this.hasLoggedStarted = false;
        this.diagnosticCounter = 0;

        console.log(`OBRProcessor: constructor called for Order ${this.order}`);

        this.port.onmessage = (event) => this.handleMessage(event);

        const wasmBinary = options.processorOptions.wasmBinary;

        ModuleFactory({
            wasmBinary: wasmBinary
        }).then((wasmModule) => {
            console.log("OBRProcessor: ModuleFactory loaded");
            this.wasm = wasmModule;
            this.setupWasm(this.numChannels, this.sampleRate);
        }).catch(err => {
            console.error('OBRProcessor: WASM instantiation failed:', err);
        });
    }

    setupWasm(numChannels, sampleRate) {
        const numFrames = 128;
        const bytesPerFloat = 4;

        this.inputPtr = this.wasm._malloc(numChannels * numFrames * bytesPerFloat);
        this.outputPtr = this.wasm._malloc(2 * numFrames * bytesPerFloat);

        this.inOffset = this.inputPtr / 4;
        this.outOffset = this.outputPtr / 4;

        if (this.wasm._obr_init) {
            this.wasm._obr_init(this.order, sampleRate);
        }

        this.ready = true;
        console.log(`OBRProcessor: WASM initialized and memory allocated (${numChannels} channels)`);
    }

    handleMessage(event) {
        if (event.data.type === 'LOAD_SOFA') {
            if (!this.wasm || !this.wasm._malloc) {
                console.warn("WASM not ready for SOFA yet");
                return;
            }

            const payload = event.data.payload; // This is an ArrayBuffer
            const size = payload.byteLength;

            // 1. Allocate memory on the WASM heap
            const ptr = this.wasm._malloc(size);

            // 2. Copy the bytes safely using a new Uint8Array over the WASM memory buffer
            const payloadBytes = new Uint8Array(payload);
            const HEAPU8 = new Uint8Array(this.wasm.HEAPF32.buffer);
            HEAPU8.set(payloadBytes, ptr);

            // 3. Hand the pointer to the C++ parser
            if (this.wasm._obr_load_sofa) this.wasm._obr_load_sofa(ptr, size);

            // 4. Free the memory to prevent leaks
            this.wasm._free(ptr);

            console.log("OBRProcessor: SOFA loaded successfully.");
        } else if (event.data.type === 'SET_SAB') {
            this.sab = event.data.payload;
            this.sabInt32 = new Int32Array(this.sab);
            this.sabFloat32 = new Float32Array(this.sab);
            this.lastSeqNum = -1;
            this.rotationLoggedCount = 0;
            console.log("[Worklet] SharedArrayBuffer received.");
        }
    }

    process(inputs, outputs) {
        if (!this.hasLoggedStarted) {
            console.log("[Worklet] OBR Worklet Processing Started");
            this.hasLoggedStarted = true;
        }

        const input = inputs[0];
        const output = outputs[0];

        if (!this.ready || !this.wasm || !input || !output) {
            return true;
        }

        // Apply rotation if SAB is present (lockless read)
        if (this.sabInt32 && this.sabFloat32 && this.wasm._obr_set_rotation) {
            // Index 0 is SEQ_NUM. We read atomically.
            const seqNum = Atomics.load(this.sabInt32, 0);
            if (seqNum !== this.lastSeqNum && seqNum > 0) {
                this.lastSeqNum = seqNum;
                // Index 1, 2, 3, 4 are x, y, z, w as defined by SAB_SCHEMA in HeadTracking.ts
                const qx = this.sabFloat32[1];
                const qy = this.sabFloat32[2];
                const qz = this.sabFloat32[3];
                const qw = this.sabFloat32[4];
                // Conjugate: negate x,y,z to counter-rotate the soundfield
                this.wasm._obr_set_rotation(qw, -qx, -qy, -qz);
            }
        }

        // 1. Copy to WASM Heap (Planar)
        for (let c = 0; c < input.length; c++) {
            if (input[c]) {
                this.wasm.HEAPF32.set(input[c], this.inOffset + (c * 128));
            }
        }

        // 2. Process: Execute OBR render
        this.wasm._obr_process(this.inputPtr, this.outputPtr, 128);

        // 3. Copy from WASM Heap to outputs (Stereo)
        if (output[0]) output[0].set(this.wasm.HEAPF32.subarray(this.outOffset, this.outOffset + 128));
        if (output[1]) output[1].set(this.wasm.HEAPF32.subarray(this.outOffset + 128, this.outOffset + 256));

        return true;
    }
}

registerProcessor('obr-processor', OBRProcessor);
