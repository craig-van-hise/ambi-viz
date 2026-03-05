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
        // obrDecoder.out -> gainNode -> destination

        expect(engine.sourceNode).toBeNull(); // JIT pattern
        expect(engine.rawAnalyser?.out.connect).toHaveBeenCalledWith(mockDecoderInstance.in);
        // obrDecoder.out connects to the gainNode (not directly to destination)
        expect(mockDecoderInstance.out.connect).toHaveBeenCalled();
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

    it('should trigger decodeAudioData when loading an .opus file (Phase 2 Checkpoint)', async () => {
        const mockFile = new File([''], 'test.opus', { type: 'audio/opus' });
        engine.queue = [{ name: 'test.opus', file: mockFile, buffer: null }];

        // Resolve decoding to prevent error state
        const mockBuffer = {} as AudioBuffer;
        (mockCtx.decodeAudioData as any).mockResolvedValue(mockBuffer);

        const setupSpy = vi.spyOn(engine, 'setupGraph').mockResolvedValue(undefined);

        await engine.loadTrack(0);

        expect(mockCtx.decodeAudioData).toHaveBeenCalled();
        expect(setupSpy).toHaveBeenCalled();
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

    it('should halt current track before loading a new one (Selection Logic fix)', async () => {
        const mockBuffer1 = { numberOfChannels: 4 } as unknown as AudioBuffer;
        const mockBuffer2 = { numberOfChannels: 4 } as unknown as AudioBuffer;
        const file1 = new File([''], '1.mp3');
        const file2 = new File([''], '2.mp3');

        engine.queue = [
            { name: '1.mp3', file: file1, buffer: mockBuffer1 },
            { name: '2.mp3', file: file2, buffer: mockBuffer2 }
        ];

        // Setup initial playing state
        await engine.loadTrack(0);
        await engine.play();
        const firstSource = engine.sourceNode;
        expect(engine.playbackState).toBe('playing');

        // Spy on methods
        const stopSpy = vi.spyOn(engine, 'stop');
        const loadTrackSpy = vi.spyOn(engine, 'loadTrack');
        const playSpy = vi.spyOn(engine, 'play');

        // Simulation of App.tsx:handleTrackSelect
        const handleTrackSelect = async (index: number) => {
            if (engine.playbackState === 'loading') return;
            engine.stop();
            await engine.loadTrack(index);
            if (engine.playbackState !== 'error') engine.play();
        };

        await handleTrackSelect(1);

        expect(stopSpy).toHaveBeenCalled();
        expect(loadTrackSpy).toHaveBeenCalledWith(1);
        expect(playSpy).toHaveBeenCalled();

        // Check call order: stop MUST be before loadTrack
        const stopOrder = stopSpy.mock.invocationCallOrder[0];
        const loadOrder = loadTrackSpy.mock.invocationCallOrder[0];
        expect(stopOrder).toBeLessThan(loadOrder);

        expect(firstSource?.stop).toHaveBeenCalled();
        expect(engine.currentIndex).toBe(1);
    });

    it('should NOT advance to the next track when seeking during playback', async () => {
        const mockBuffer = { numberOfChannels: 4, duration: 120 } as unknown as AudioBuffer;
        const file1 = new File([''], '1.mp3');
        const file2 = new File([''], '2.mp3');

        engine.queue = [
            { name: '1.mp3', file: file1, buffer: mockBuffer },
            { name: '2.mp3', file: file2, buffer: mockBuffer }
        ];

        await engine.loadTrack(0);
        await engine.play();
        expect(engine.playbackState).toBe('playing');
        expect(engine.currentIndex).toBe(0);

        // Capture old source to verify onended was detached
        const oldSource = engine.sourceNode;
        expect(oldSource).not.toBeNull();
        expect(oldSource?.onended).not.toBeNull();

        const nextSpy = vi.spyOn(engine, 'next');

        // Seek mid-track — this should NOT trigger next()
        engine.seek(30);

        // The old source's onended should have been nulled out before stop()
        expect(oldSource?.onended).toBeNull();
        expect(nextSpy).not.toHaveBeenCalled();
        expect(engine.currentIndex).toBe(0);
        expect(engine.playbackState).toBe('playing');
    });

    it('should update gainNode value when setVolume is called', async () => {
        const mockGainParam = { value: 1 };
        const mockGainNode = {
            connect: vi.fn(),
            gain: mockGainParam,
        };
        (mockCtx.createGain as any).mockReturnValue(mockGainNode);

        // Re-create engine to pick up the mocked createGain
        engine = new AudioEngine();

        engine.setVolume(50);
        expect(mockGainParam.value).toBeCloseTo(0.5);

        engine.setVolume(0);
        expect(mockGainParam.value).toBeCloseTo(0);

        engine.setVolume(100);
        expect(mockGainParam.value).toBeCloseTo(1.0);
    });
});
