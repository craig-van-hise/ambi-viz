import * as ambisonics from 'ambisonics';
// @ts-ignore
import { RawCoefAnalyser } from './RawCoefAnalyser';

export class AudioEngine {
    audioCtx: AudioContext;
    sourceNode: AudioBufferSourceNode | null = null;
    rawAnalyser: RawCoefAnalyser | null = null;
    binDecoder: any | null = null; // JSAmbisonics.binDecoder
    order: number = 1;

    // Smoothing state
    smoothedCoeffs: Float32Array;

    constructor() {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.smoothedCoeffs = new Float32Array(16); // Max order 3 (16 channels)
    }

    async loadFile(file: File): Promise<void> {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

        await this.setupGraph(audioBuffer);
    }

    async setupGraph(buffer: AudioBuffer) {
        // 1. Detect Order
        const nCh = buffer.numberOfChannels;
        if (nCh === 4) this.order = 1;
        else if (nCh === 9) this.order = 2;
        else if (nCh === 16) this.order = 3;
        else {
            console.warn(`Unsupported channel count: ${nCh}. Defaulting to Order 1 (4ch).`);
            this.order = 1;
            // In a real app we might handle mismatch or error out
        }

        // 2. Prepare Nodes
        if (this.sourceNode) this.sourceNode.stop();
        this.sourceNode = this.audioCtx.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = true;

        // 3. Raw Data Extraction
        this.rawAnalyser = new RawCoefAnalyser(this.audioCtx, this.order);

        // 4. Binaural Decoder
        this.binDecoder = new ambisonics.binDecoder(this.audioCtx, this.order);

        // Load HRIR (using local JSON converted from SOFA)
        const loader = new ambisonics.HRIRloader_local(this.audioCtx, this.order, (decodedBuffer: AudioBuffer) => {
            console.log('HRIR loaded from JSON');
            this.binDecoder.updateFilters(decodedBuffer);
        });
        loader.load('/hrtf/hrtf_kemar.json');

        // 5. Connect Graph
        // Source -> RawAnalyser -> BinDecoder -> Destination
        // RawAnalyser has .in and .out (pass-through)
        this.sourceNode.connect(this.rawAnalyser.in);
        this.rawAnalyser.out.connect(this.binDecoder.in);
        this.binDecoder.out.connect(this.audioCtx.destination);

        this.sourceNode.start();
    }

    update(): Float32Array {
        if (!this.rawAnalyser) return new Float32Array(16);

        // 1. Get raw RMS values for this frame
        const raw = this.rawAnalyser.getCoefficients();

        // 2. Apply Ballistics
        const attack = 0.1;
        const release = 0.9; // 0.9 means slower decay? Formula: y = y_prev * release ... 
        // PRP: "Use the attack coefficient if (rising), and release if falling."
        // Standard digital LPF: y[n] = x[n]*alpha + y[n-1]*(1-alpha)
        // Ballistics usually:
        // if x > y_prev: y = y_prev + (x - y_prev) * attack
        // else:          y = y_prev + (x - y_prev) * release
        // Check logic: if release is 0.9 (slow), it might mean coeff=0.1? 
        // PRP says: "Define attack = 0.1 and release = 0.9."
        // Usually release is slow, so we want to keep 90% of old value? 
        // Let's assume the standard: val = prev * coeff + target * (1-coeff)
        // Rising: use attack. Falling: use release.

        for (let i = 0; i < raw.length; i++) {
            const current = raw[i];
            const prev = this.smoothedCoeffs[i];

            if (current > prev) {
                // Rising
                this.smoothedCoeffs[i] = prev * (1 - attack) + current * attack;
                // Or typically: val = val + (target - val) * coef
                // val += (current - prev) * attack
            } else {
                // Falling
                // If release is 0.9, maybe it means retention? "Simple infinite impulse response (IIR) filter"
                // Often release time is defined as time to drop X dB.
                // Let's interpret "release = 0.9" as "retain 90% of previous value", i.e. decay by 10%.
                // val = prev * 0.9 + current * 0.1 ?? 
                // Or just independent decay?
                // Let's stick to linear interpolation logic for now:
                // val += (current - prev) * (1 - release) ?? No that's confusing.
                // Let's assume the PRP implies coefficients for the *new* value contribution?
                // No, attack 0.1 is fast? No, 0.1 is slow if it's "add 10% of difference".
                // Wait, "release = 0.9". If I use 0.9 as the weight for the PREVIOUS value, it decays slowly.
                // y = prev * 0.9 + curr * 0.1.
                // If attack is 0.1, it's also slow?
                // Maybe attack should be 0.9 (fast)?
                // PRP: "attack = 0.1 and release = 0.9".
                // "Use attack... if rising".
                // If I process audio at 60fps, 0.1 means valid reaches target in ~20 frames.

                // Let's implement:
                // if rising: y = prev + (curr - prev) * attack
                // if falling: y = prev + (curr - prev) * (1 - release) ??

                // Let's try:
                // coeff = (curr > prev) ? attack : (1 - release) 
                // We'll tune this.

                this.smoothedCoeffs[i] = prev + (current - prev) * (current > prev ? attack : (1 - release));
            }
        }

        return this.smoothedCoeffs;
    }

    getCovariance(): Float32Array {
        if (!this.rawAnalyser) return new Float32Array(this.order * this.order); // Fallback
        return this.rawAnalyser.getCovarianceMatrix();
    }

    resume() {
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }
}
