export class RawCoefAnalyser {
    ctx: AudioContext;
    order: number;
    nCh: number;
    analysers: AnalyserNode[];
    dataArrays: Float32Array[];
    in: ChannelSplitterNode;
    out: ChannelMergerNode; // Pass-through

    constructor(ctx: AudioContext, order: number) {
        this.ctx = ctx;
        this.order = order;
        this.nCh = (order + 1) * (order + 1);

        this.analysers = [];
        this.dataArrays = [];

        this.in = ctx.createChannelSplitter(this.nCh);
        this.out = ctx.createChannelMerger(this.nCh);

        for (let i = 0; i < this.nCh; i++) {
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048; // Adjust as needed for resolution vs perf
            analyser.smoothingTimeConstant = 0; // We handle smoothing manually (ballistics)
            this.analysers.push(analyser);
            this.dataArrays.push(new Float32Array(analyser.fftSize));

            // Connect input channel i to analyser
            this.in.connect(analyser, i, 0);

            // Pass through to output
            this.in.connect(this.out, i, i);
        }
    }

    /**
     * Updates and returns the latest RMS or Peak value for each coefficient.
     * For visualization, we often want the instantaneous amplitude or energy.
     * Here we'll return the RMS of the current buffer block to get a stable value,
     * or just the last sample if we want raw waveform. 
     * The PRP suggests "Raw audio coefficients fluctuate... Implement temporal smoothing".
     * So we should probably capture a "representative" value for this frame.
     * RMS is a good candidate for "Energy/Amplitude".
     */
    /**
     * Calculates the Covariance Matrix of the Ambisonic coefficients for the current frame.
     * C_ij = mean(c_i * c_j) over the buffer.
     * This preserves spatial correlation and is used for the Phase 2 Power Map visualization.
     * Returns a flattened Float32Array of size nCh * nCh.
     */
    getCovarianceMatrix(): Float32Array {
        // Retrieve fresh data for all channels
        for (let i = 0; i < this.nCh; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.analysers[i].getFloatTimeDomainData(this.dataArrays[i] as any);
        }

        const cov = new Float32Array(this.nCh * this.nCh);
        const len = this.dataArrays[0].length;
        const norm = 1.0 / len;

        // Compute C_ij
        // We only need upper triangle for minimal math, but shader might want full matrix.
        // Let's compute full symmetric matrix for simplicity in shader.
        // Optimization: Compute Triangle, copy to symmetric part.

        for (let i = 0; i < this.nCh; i++) {
            for (let j = i; j < this.nCh; j++) {
                let sum = 0;
                const dataI = this.dataArrays[i];
                const dataJ = this.dataArrays[j];

                // Unroll or just loop
                for (let k = 0; k < len; k++) {
                    sum += dataI[k] * dataJ[k];
                }

                const val = sum * norm;
                cov[i * this.nCh + j] = val;
                if (i !== j) {
                    cov[j * this.nCh + i] = val;
                }
            }
        }

        // Also return RMS for backward compatibility or UI meters?
        // We can re-use the diagonal elements: cov[i*nCh + i] = mean(c_i^2) = RMS^2.
        // So sqrt(cov[i*nCh+i]) is RMS.

        return cov;
    }

    getCoefficients(): Float32Array {
        // Keep existing method for the 2D bar graph (Analizer UI)
        // Recalculates RMS or re-uses data? 
        // Let's just do the RMS calc again to be safe/simple, or call getCovarianceMatrix and extract diagonal.
        // Re-calculating is faster than allocating matrix if we just want UI.
        const coeffs = new Float32Array(this.nCh);
        for (let i = 0; i < this.nCh; i++) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.analysers[i].getFloatTimeDomainData(this.dataArrays[i] as any);
            let sumSq = 0;
            const data = this.dataArrays[i];
            for (let k = 0; k < data.length; k++) sumSq += data[k] * data[k];
            coeffs[i] = Math.sqrt(sumSq / data.length);
        }
        return coeffs;
    }
}
