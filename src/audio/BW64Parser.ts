export class BW64Parser {
    /**
     * Parses a BW64 or RIFF array buffer and returns an AudioBuffer.
     * @param arrayBuffer The raw file bytes
     * @param audioCtx The AudioContext to create the buffer with
     */
    static async parse(arrayBuffer: ArrayBuffer, audioCtx: AudioContext): Promise<AudioBuffer> {
        const view = new DataView(arrayBuffer);

        if (arrayBuffer.byteLength < 12) {
            throw new Error('Invalid file: too short');
        }

        // Magic bytes
        const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
        if (magic !== 'BW64' && magic !== 'RIFF') {
            throw new Error('Invalid file type: expected BW64 or RIFF');
        }

        const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
        if (wave !== 'WAVE') {
            throw new Error('Invalid file type: expected WAVE');
        }

        let fmt: any = null;
        let dataOffset = 0;
        let dataSize = 0;
        let offset = 12;

        while (offset < arrayBuffer.byteLength) {
            if (offset + 8 > arrayBuffer.byteLength) break;

            const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
            let chunkSize = view.getUint32(offset + 4, true);
            const chunkDataOffset = offset + 8;

            if (chunkId === 'fmt ') {
                fmt = {
                    format: view.getUint16(chunkDataOffset, true),
                    channels: view.getUint16(chunkDataOffset + 2, true),
                    sampleRate: view.getUint32(chunkDataOffset + 4, true),
                    byteRate: view.getUint32(chunkDataOffset + 8, true),
                    blockAlign: view.getUint16(chunkDataOffset + 12, true),
                    bitsPerSample: view.getUint16(chunkDataOffset + 14, true)
                };

                if (fmt.format === 0xFFFE && chunkSize >= 40) { // Extensible
                    fmt.validBitsPerSample = view.getUint16(chunkDataOffset + 18, true);
                    fmt.channelMask = view.getUint32(chunkDataOffset + 20, true);
                    fmt.subFormat = view.getUint16(chunkDataOffset + 24, true); // 1 = PCM, 3 = Float
                }
            } else if (chunkId === 'ds64') {
                // Ignore for now unless dataSize wasn't properly resolved
                // A full BW64 parser would read these 64-bit values
            } else if (chunkId === 'data') {
                dataOffset = chunkDataOffset;
                if (chunkSize === 0xFFFFFFFF) {
                    // Fallback to remaining file size if ds64 wasn't fully processed or missing
                    // Technically should read from ds64 but this works for simple files
                    dataSize = arrayBuffer.byteLength - dataOffset;
                } else {
                    dataSize = chunkSize;
                }
                // We don't break early so we can parse ds64 if it comes after (it shouldn't per spec, but just in case)
            }

            offset = chunkDataOffset + chunkSize;
            if (chunkSize % 2 !== 0) offset++; // Pad byte
        }

        if (!fmt) throw new Error('Could not find fmt chunk');
        if (dataOffset === 0) throw new Error('Could not find data chunk');

        // Extract PCM
        const bytesPerSample = fmt.bitsPerSample / 8;
        const totalSamples = dataSize / bytesPerSample;
        const frames = totalSamples / fmt.channels;

        const isFloat = fmt.format === 3 || (fmt.format === 0xFFFE && fmt.subFormat === 3);
        const audioBuffer = audioCtx.createBuffer(fmt.channels, frames, fmt.sampleRate);

        // We need to de-interleave the data into planar Float32Arrays
        for (let ch = 0; ch < fmt.channels; ch++) {
            const channelData = new Float32Array(frames);

            for (let i = 0; i < frames; i++) {
                const sampleOffset = dataOffset + (i * fmt.channels + ch) * bytesPerSample;

                if (sampleOffset + bytesPerSample > arrayBuffer.byteLength) {
                    break; // Out of bounds safety
                }

                if (isFloat && bytesPerSample === 4) {
                    channelData[i] = view.getFloat32(sampleOffset, true);
                } else if (bytesPerSample === 2) {
                    const int16 = view.getInt16(sampleOffset, true);
                    channelData[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
                } else if (bytesPerSample === 3) {
                    // 24-bit PCM
                    const b0 = view.getUint8(sampleOffset);
                    const b1 = view.getUint8(sampleOffset + 1);
                    const b2 = view.getUint8(sampleOffset + 2);
                    let int24 = b0 | (b1 << 8) | (b2 << 16);
                    if (int24 & 0x800000) {
                        int24 -= 0x1000000;
                    }
                    channelData[i] = int24 < 0 ? int24 / 8388608.0 : int24 / 8388607.0;
                } else if (bytesPerSample === 4) {
                    // 32-bit Integer
                    const int32 = view.getInt32(sampleOffset, true);
                    channelData[i] = int32 < 0 ? int32 / 2147483648.0 : int32 / 2147483647.0;
                }
            }
            audioBuffer.copyToChannel(channelData, ch);
        }

        return audioBuffer;
    }
}
