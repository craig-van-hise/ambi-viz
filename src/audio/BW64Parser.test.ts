import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BW64Parser } from './BW64Parser';

// Mock AudioContext to verify our float32 arrays are passed correctly
class MockAudioBuffer {
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    channels: Float32Array[];

    constructor(options: { numberOfChannels: number, length: number, sampleRate: number }) {
        this.numberOfChannels = options.numberOfChannels;
        this.length = options.length;
        this.sampleRate = options.sampleRate;
        this.channels = Array(options.numberOfChannels).fill(0).map(() => new Float32Array(options.length));
    }

    copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number) {
        this.channels[channelNumber].set(source, startInChannel || 0);
    }
}

class MockAudioContext {
    createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
        return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
    }
}

function createWavBuffer(magic: string, channels: number, sampleRate: number, bits: number, pcmData: number[]): ArrayBuffer {
    // A simple builder for mock wav/bw64 buffers
    const formatChunkSize = 16;
    const byteRate = sampleRate * channels * (bits / 8);
    const blockAlign = channels * (bits / 8);

    let pcmByteSize = pcmData.length * (bits / 8);

    let bufferSize = 12 + 8 + formatChunkSize + 8 + pcmByteSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    let offset = 0;
    const writeString = (str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset++, str.charCodeAt(i));
        }
    }

    writeString(magic);
    view.setUint32(offset, bufferSize - 8, true); offset += 4;
    writeString('WAVE');

    // fmt chunk
    writeString('fmt ');
    view.setUint32(offset, formatChunkSize, true); offset += 4;
    view.setUint16(offset, bits === 32 ? 3 : 1, true); // type (1=pcm, 3=float)
    offset += 2;
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bits, true); offset += 2;

    // data chunk
    writeString('data');
    view.setUint32(offset, pcmByteSize, true); offset += 4;

    for (const val of pcmData) {
        if (bits === 16) {
            view.setInt16(offset, val, true);
            offset += 2;
        } else if (bits === 24) {
            const low = val & 0xFF;
            const mid = (val >> 8) & 0xFF;
            const high = (val >> 16) & 0xFF;
            view.setUint8(offset++, low);
            view.setUint8(offset++, mid);
            view.setUint8(offset++, high);
        } else if (bits === 32) {
            view.setFloat32(offset, val, true);
            offset += 4;
        }
    }

    return arrayBuffer;
}

describe('BW64Parser', () => {
    let mockCtx: any;

    beforeEach(() => {
        mockCtx = new MockAudioContext();
    });

    it('should throw an error if the magic string is incorrect', async () => {
        const buffer = new ArrayBuffer(16);
        const view = new DataView(buffer);
        view.setUint8(0, 'J'.charCodeAt(0));
        await expect(BW64Parser.parse(buffer, mockCtx)).rejects.toThrow('Invalid file type: expected BW64 or RIFF');
    });

    it('should decode a 16-bit 2-channel stereo file correctly', async () => {
        const pcmData = [
            0, 32767,      // frame 1 (L, R)
            -32768, 0      // frame 2
        ];
        // 16-bit range is -32768 to 32767, converting to float [-1.0, 1.0)
        // 32767 -> ~0.9999
        // -32768 -> -1.0
        const buffer = createWavBuffer('BW64', 2, 48000, 16, pcmData);

        const audioBuf = await BW64Parser.parse(buffer, mockCtx) as unknown as MockAudioBuffer;

        expect(audioBuf.numberOfChannels).toBe(2);
        expect(audioBuf.sampleRate).toBe(48000);
        expect(audioBuf.length).toBe(2); // 2 frames

        const left = audioBuf.channels[0];
        const right = audioBuf.channels[1];

        expect(left[0]).toBeCloseTo(0);
        expect(left[1]).toBeCloseTo(-1);

        expect(right[0]).toBeCloseTo(32767 / 32768);
        expect(right[1]).toBeCloseTo(0);
    });

    it('should decode a 24-bit 1-channel mono file correctly', async () => {
        const pcmData = [
            0,             // 0
            8388607,       // max positive (2^23 - 1)
            -8388608       // min negative (-2^23)
        ];
        const buffer = createWavBuffer('BW64', 1, 44100, 24, pcmData);

        const audioBuf = await BW64Parser.parse(buffer, mockCtx) as unknown as MockAudioBuffer;

        expect(audioBuf.numberOfChannels).toBe(1);
        expect(audioBuf.sampleRate).toBe(44100);
        expect(audioBuf.length).toBe(3);

        const channel = audioBuf.channels[0];
        expect(channel[0]).toBeCloseTo(0);
        expect(channel[1]).toBeCloseTo(8388607 / 8388608);
        expect(channel[2]).toBeCloseTo(-1.0);
    });

    it('should decode a 32-bit float file correctly', async () => {
        const pcmData = [
            0.5, -0.25, 1.0, -1.0
        ];
        const buffer = createWavBuffer('BW64', 1, 48000, 32, pcmData);

        const audioBuf = await BW64Parser.parse(buffer, mockCtx) as unknown as MockAudioBuffer;
        expect(audioBuf.length).toBe(4);

        const channel = audioBuf.channels[0];
        expect(channel[0]).toBeCloseTo(0.5);
        expect(channel[1]).toBeCloseTo(-0.25);
        expect(channel[2]).toBeCloseTo(1.0);
        expect(channel[3]).toBeCloseTo(-1.0);
    });

    it('should support standard RIFF WAVE as a fallback', async () => {
        const pcmData = [0, 0];
        const buffer = createWavBuffer('RIFF', 1, 48000, 16, pcmData);
        const audioBuf = await BW64Parser.parse(buffer, mockCtx) as unknown as MockAudioBuffer;
        expect(audioBuf.numberOfChannels).toBe(1);
    });
});
