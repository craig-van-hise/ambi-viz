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
                disconnect: vi.fn(),
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
        mockDecoderInstance.loadSofa.mockReset();
        mockDecoderInstance.loadSofa.mockResolvedValue(undefined);
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
        // rawAnalyser.out -> obrDecoder.in
        // obrDecoder.out -> destination

        expect(engine.sourceNode).toBeNull(); // JIT pattern
        expect(engine.rawAnalyser?.out.connect).toHaveBeenCalledWith(mockDecoderInstance.in);
        expect(mockDecoderInstance.out.connect).toHaveBeenCalledWith(mockCtx.destination);
    });

    it('should await loadSofa before enabling playback (Phase 10 Gate)', async () => {
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
            disconnect: vi.fn(),
            buffer: null,
            loop: false
        };
        (mockCtx.createBufferSource as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue(mockSource);

        // Mock a slow loadSofa to verify the gate works
        mockDecoderInstance.loadSofa.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            // Ensure start hasn't been called yet during graph setup
            expect(startCalled).toBe(false);
        });

        await engine.setupGraph(mockBuffer);

        // After setupGraph, SOFA should be loaded but start() should NOT have been called
        expect(mockDecoderInstance.loadSofa).toHaveBeenCalled();
        expect(mockSource.start).not.toHaveBeenCalled();
        expect(startCalled).toBe(false);

        // Only after explicit play() should start() be called
        engine.play();
        expect(mockSource.start).toHaveBeenCalled();
        expect(startCalled).toBe(true);
    });

    it('should transition to "loading" and then to "error" if decoding fails', async () => {
        const mockFile = new File([''], 'test.mp3');
        engine.queue = [{ name: 'test.mp3', file: mockFile, buffer: null }];

        const error = new Error('Decoding failed');
        (mockCtx.decodeAudioData as any).mockRejectedValue(error);

        const states: string[] = [];
        engine.onStateChange = (state) => states.push(state);

        await engine.loadTrack(0);

        expect(states).toContain('loading');
        expect(states).toContain('error');
        expect(engine.playbackState).toBe('error');
    });

    it('should create a new source node on play() if null, and destroy it on stop()', async () => {
        const mockBuffer = { numberOfChannels: 4 } as AudioBuffer;
        await engine.setupGraph(mockBuffer);

        // After setupGraph in Phase 2, sourceNode should be null
        // (Wait, I haven't implemented Phase 2 yet, so this test will fail)

        expect(engine.sourceNode).toBeNull();

        engine.play();
        expect(mockCtx.createBufferSource).toHaveBeenCalled();
        expect(engine.sourceNode).not.toBeNull();
        expect(engine.sourceNode?.start).toHaveBeenCalled();

        const oldSource = engine.sourceNode;
        engine.stop();
        expect(oldSource?.stop).toHaveBeenCalled();
        expect(oldSource?.disconnect).toHaveBeenCalled();
        expect(engine.sourceNode).toBeNull();
    });

    it('should stop current track and auto-play the next one', async () => {
        const mockBuffer1 = { numberOfChannels: 4 } as unknown as AudioBuffer;
        const mockBuffer2 = { numberOfChannels: 4 } as unknown as AudioBuffer;
        const file1 = new File([''], '1.mp3');
        const file2 = new File([''], '2.mp3');

        engine.queue = [
            { name: '1.mp3', file: file1, buffer: mockBuffer1 },
            { name: '2.mp3', file: file2, buffer: mockBuffer2 }
        ];
        engine.currentIndex = 0;

        // Load first track manually to setup state
        await engine.loadTrack(0);
        await engine.play();

        const firstSource = engine.sourceNode;
        expect(firstSource).not.toBeNull();
        expect(engine.playbackState).toBe('playing');

        // Trigger next()
        await engine.next();

        expect(firstSource?.stop).toHaveBeenCalled();
        expect(engine.currentIndex).toBe(1);
        expect(engine.sourceNode).not.toBe(firstSource);
        expect(engine.sourceNode).not.toBeNull();
        expect(engine.playbackState).toBe('playing');
    });
});
