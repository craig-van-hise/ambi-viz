import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OBRDecoder } from './OBRDecoder';

describe('OBRDecoder', () => {
    let mockCtx: AudioContext;

    beforeEach(() => {
        mockCtx = {
            createGain: vi.fn(() => ({
                connect: vi.fn()
            })),
            audioWorklet: {
                addModule: vi.fn().mockResolvedValue(undefined)
            },
            sampleRate: 44100
        } as unknown as AudioContext;

        // Mock AudioWorkletNode globally for the test
        const MockNode = vi.fn().mockImplementation(function () {
            return {
                connect: vi.fn()
            };
        });
        (globalThis as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = MockNode;
    });

    it('initializes with GainNodes', () => {
        const decoder = new OBRDecoder(mockCtx, 3);
        expect(decoder.in).toBeDefined();
        expect(decoder.out).toBeDefined();
        expect(mockCtx.createGain).toHaveBeenCalledTimes(2);
    });

    it('calls addModule and creates AudioWorkletNode on init with WASM', async () => {
        const order = 3;
        const numChannels = 16;
        const sampleRate = 48000;
        (mockCtx as unknown as { sampleRate: number }).sampleRate = sampleRate;
        const decoder = new OBRDecoder(mockCtx, order);

        // Mock fetch
        const mockWasmBuffer = new ArrayBuffer(8);
        const mockResponse = {
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(mockWasmBuffer)
        };
        (globalThis as unknown as { fetch: unknown }).fetch = vi.fn().mockResolvedValue(mockResponse);

        // Mock WebAssembly.compile
        const mockModule = { isMock: true };
        (globalThis as unknown as { WebAssembly: { compile: unknown } }).WebAssembly = {
            compile: vi.fn().mockResolvedValue(mockModule)
        };

        await decoder.init();

        expect(globalThis.fetch).toHaveBeenCalledWith('/obr.wasm');
        expect(mockCtx.audioWorklet.addModule).toHaveBeenCalledWith('/worklets/obr-processor.js', expect.objectContaining({ type: 'module' }));
        expect((globalThis as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode).toHaveBeenCalledWith(mockCtx, 'obr-processor', expect.objectContaining({
            numberOfInputs: 1,
            numberOfOutputs: 1,
            processorOptions: {
                wasmBinary: mockWasmBuffer,
                order,
                sampleRate
            },
            channelCount: numChannels,
            channelCountMode: 'explicit',
            channelInterpretation: 'discrete',
            outputChannelCount: [2]
        }));
    });

    it('loadSofa fetches file and sends message to port', async () => {
        const order = 3;
        const decoder = new OBRDecoder(mockCtx, order);

        // Mock init to set workletNode
        const mockPort = { postMessage: vi.fn() };
        const mockWorkletNode = { port: mockPort, connect: vi.fn() };
        (globalThis as unknown as { AudioWorkletNode: unknown }).AudioWorkletNode = vi.fn().mockImplementation(function () {
            return mockWorkletNode;
        });

        // Mock fetch for WASM (called in init)
        (globalThis as unknown as { fetch: unknown }).fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) // WASM
            .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) }); // SOFA

        // Mock WebAssembly
        (globalThis as unknown as { WebAssembly: { compile: unknown } }).WebAssembly = { compile: vi.fn().mockResolvedValue({}) };

        await decoder.init();
        await decoder.loadSofa('/test.sofa');

        expect(globalThis.fetch).toHaveBeenCalledWith('/test.sofa');
        expect(mockPort.postMessage).toHaveBeenCalledWith({
            type: 'LOAD_SOFA',
            payload: expect.any(ArrayBuffer)
        });
    });
});
