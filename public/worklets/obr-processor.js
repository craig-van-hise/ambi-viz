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

            // 2. Copy the bytes safely using HEAPU8
            const payloadBytes = new Uint8Array(payload);
            this.wasm.HEAPU8.set(payloadBytes, ptr);

            // 3. Hand the pointer to the C++ parser
            this.wasm._obr_load_sofa(ptr, size);

            // 4. Free the memory to prevent leaks
            this.wasm._free(ptr);

            console.log("OBRProcessor: SOFA loaded successfully.");
        }
    }

    process(inputs, outputs) {
        if (!this.hasLoggedStarted) {
            console.log("OBR Worklet: Processing Started");
            this.hasLoggedStarted = true;
        }

        const input = inputs[0];
        const output = outputs[0];

        if (!this.ready || !this.wasm || !input || !output) {
            return true;
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

        // --- DIAGNOSTIC PROBE ---
        if (this.ready && input[0] && this.diagnosticCounter < 100) {
            this.diagnosticCounter++;
            if (this.diagnosticCounter === 100) {
                console.log("=== WASM AUDIO DIAGNOSTIC ===");
                console.log("INPUT CH 0 (First 5 frames):", input[0].slice(0, 5));
                console.log("WASM OUTPUT LEFT (First 5 frames):", output[0].slice(0, 5));

                // Check for NaNs
                const hasNaN = isNaN(output[0][0]);
                if (hasNaN) console.error("CRITICAL: WASM is outputting NaN. Audio graph is muted.");

                // Check for absolute silence
                const isSilent = output[0][0] === 0 && output[0][1] === 0 && output[0][2] === 0;
                if (isSilent && input[0][0] !== 0) console.error("CRITICAL: WASM is eating the signal (Output is 0.0). C++ Engine likely missing HRTF/AudioElement initialization.");
            }
        }
        // ------------------------

        return true;
    }
}

registerProcessor('obr-processor', OBRProcessor);
