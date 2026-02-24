import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEngine } from './AudioEngine';
import { OBRDecoder } from './OBRDecoder';

// Mock OBRDecoder
const mockDecoderInstance = {
    init: vi.fn().mockResolvedValue(undefined),
    loadSofa: vi.fn().mockResolvedValue(undefined),
    in: { connect: vi.fn() },
    out: { connect: vi.fn() }
};

vi.mock('./OBRDecoder', () => ({
    OBRDecoder: vi.fn().mockImplementation(function () {
        return mockDecoderInstance;
    })
}));

// Mock RawCoefAnalyser
vi.mock('./RawCoefAnalyser', () => ({
    RawCoefAnalyser: vi.fn().mockImplementation(function () {
        return {
            in: { connect: vi.fn() },
            out: { connect: vi.fn() }
        };
    })
}));

describe('AudioEngine Integration', () => {
    let engine: AudioEngine;
    let mockCtx: AudioContext;

    beforeEach(() => {
        mockCtx = {
            createBufferSource: vi.fn(() => ({
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                buffer: null,
                loop: false
            })),
            createGain: vi.fn(() => ({
                connect: vi.fn()
            })),
            destination: {} as AudioDestinationNode,
            decodeAudioData: vi.fn(),
            resume: vi.fn().mockResolvedValue(undefined)
        } as unknown as AudioContext;

        // Mock window/global AudioContext
        const MockCtx = vi.fn().mockImplementation(function () { return mockCtx; });
        (globalThis as unknown as { AudioContext: unknown }).AudioContext = MockCtx;
        (globalThis as unknown as { window: unknown }).window = { AudioContext: MockCtx };

        engine = new AudioEngine();
        vi.clearAllMocks();
    });

    it('should setup the graph with OBRDecoder', async () => {
        const mockBuffer = {
            numberOfChannels: 4,
            length: 1000,
            sampleRate: 48000
        } as unknown as AudioBuffer;

        await engine.setupGraph(mockBuffer);

        expect(OBRDecoder).toHaveBeenCalledWith(mockCtx, 1);
        expect(mockDecoderInstance.init).toHaveBeenCalled();
        expect(mockDecoderInstance.loadSofa).toHaveBeenCalledWith('/hrtf/MIT_KEMAR_Normal.sofa');

        // Check connections
        // source -> rawAnalyser.in
        // rawAnalyser.out -> obrDecoder.in
        // obrDecoder.out -> destination

        expect(engine.sourceNode?.connect).toHaveBeenCalledWith(engine.rawAnalyser?.in);
        expect(engine.rawAnalyser?.out.connect).toHaveBeenCalledWith(mockDecoderInstance.in);
        expect(mockDecoderInstance.out.connect).toHaveBeenCalledWith(mockCtx.destination);
    });

    it('should await loadSofa before starting playback (Phase 10 Gate)', async () => {
        const mockBuffer = {
            numberOfChannels: 4,
            length: 1000,
            sampleRate: 48000
        } as unknown as AudioBuffer;

        let startCalled = false;
        const mockSource = {
            connect: vi.fn(),
            start: vi.fn(() => { startCalled = true; }),
            stop: vi.fn(),
            buffer: null,
            loop: false
        };
        (mockCtx.createBufferSource as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue(mockSource);

        // Mock a slow loadSofa to verify the gate works
        mockDecoderInstance.loadSofa.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            // Ensure start hasn't been called yet
            expect(startCalled).toBe(false);
        });

        await engine.setupGraph(mockBuffer);

        expect(mockDecoderInstance.loadSofa).toHaveBeenCalled();
        expect(mockSource.start).toHaveBeenCalled();
        expect(startCalled).toBe(true);
    });
});
