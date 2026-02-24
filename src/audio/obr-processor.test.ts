import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('OBRProcessor Registration', () => {
    it('should register obr-processor', () => {
        const filePath = path.resolve(__dirname, '../../public/worklets/obr-processor.js');
        const code = fs.readFileSync(filePath, 'utf8');

        // Mock globals
        let registeredName = '';
        type ProcessorConstructor = new (options: { processorOptions?: { order?: number } }) => { order: number; numChannels: number };
        let processorClass: ProcessorConstructor | null = null;

        const mockRegisterProcessor = (name: string, proc: ProcessorConstructor) => {
            registeredName = name;
            processorClass = proc;
        };

        class MockPort { onmessage = null; }

        // Execute code in a scoped environment
        const fn = new Function('AudioWorkletProcessor', 'registerProcessor', 'console', code);
        const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

        // We need to polyfill 'this.port' for the constructor
        // AudioWorkletProcessor doesn't have port, but OBRProcessor calls this.port
        // In reality, this.port is provided by the system.
        // Let's modify the mock class.
        class MockAudioWorkletProcessor {
            port = new MockPort();
        }

        fn(MockAudioWorkletProcessor, mockRegisterProcessor, mockConsole);

        expect(registeredName).toBe('obr-processor');
        expect(processorClass).toBeDefined();

        // Verify it handles order correctly
        const options = {
            processorOptions: {
                order: 3,
                sampleRate: 48000
            }
        };
        if (processorClass) {
            const Proc = processorClass as unknown as {
                new(options: unknown): {
                    order: number;
                    numChannels: number;
                    setupWasm: (inst: unknown, nCh: number, sr: number) => void;
                    process: (inp: unknown, outp: unknown) => boolean;
                    handleMessage: (ev: unknown) => void;
                    inputPtr: number;
                    outputPtr: number;
                    ready: boolean;
                }
            };
            const instance = new Proc(options);
            expect(instance.order).toBe(3);
            expect(instance.numChannels).toBe(16);

            // Test setupWasm
            const mockWasm = {
                _malloc: vi.fn((size) => size), // return size as dummy ptr
                _obr_init: vi.fn(),
                _obr_process: vi.fn(),
                memory: { buffer: new ArrayBuffer(1024 * 1024) }
            };
            const mockInstance = { exports: mockWasm };

            instance.setupWasm(mockInstance, 16, 48000);

            expect(instance.ready).toBe(true);
            expect(mockWasm._malloc).toHaveBeenCalledWith(16 * 128 * 4); // Input: nCh * 128 * 4
            expect(mockWasm._malloc).toHaveBeenCalledWith(2 * 128 * 4);  // Output: 2 * 128 * 4
            expect(mockWasm._obr_init).toHaveBeenCalledWith(3, 48000);

            // Test process method
            const mockInputs = [
                Array.from({ length: 16 }, () => new Float32Array(128).fill(0.5))
            ];
            const mockOutputs = [
                Array.from({ length: 2 }, () => new Float32Array(128))
            ];

            // Fill heap with some values at outputPtr to verify copy back
            const outputOffset = instance.outputPtr / 4;
            const heap = new Float32Array(mockWasm.memory.buffer);
            for (let i = 0; i < 256; i++) heap[outputOffset + i] = 0.8;

            const result = instance.process(mockInputs, mockOutputs);

            expect(result).toBe(true);
            expect(mockWasm._obr_process).toHaveBeenCalledWith(instance.inputPtr, instance.outputPtr, 128);

            // Verify input was copied to heap (check first sample of first channel)
            const inputOffset = instance.inputPtr / 4;
            expect(heap[inputOffset]).toBe(0.5);

            // Verify output was copied from heap
            expect(mockOutputs[0][0][0]).toBeCloseTo(0.8);
            expect(mockOutputs[0][1][0]).toBeCloseTo(0.8);

            // Test handleMessage for SOFA loading
            const mockSofaPayload = new ArrayBuffer(10);
            const mockEvent = { data: { type: 'LOAD_SOFA', payload: mockSofaPayload } };

            const wasmWithExtras = mockWasm as unknown as {
                _malloc: { mockClear: () => void };
                _free: unknown;
                _obr_load_sofa: unknown;
            };
            wasmWithExtras._malloc.mockClear();
            wasmWithExtras._free = vi.fn();
            wasmWithExtras._obr_load_sofa = vi.fn();

            instance.handleMessage(mockEvent);

            expect(wasmWithExtras._malloc).toHaveBeenCalledWith(10);
            expect(wasmWithExtras._obr_load_sofa).toHaveBeenCalledWith(expect.any(Number), 10);
            expect(wasmWithExtras._free).toHaveBeenCalled();

            // Test fallback behavior (Phase 11)
            instance.ready = false;
            const mockFallbackInput = [new Float32Array(128).fill(0.7)];
            const mockFallbackOutput = [new Float32Array(128), new Float32Array(128)];

            const fallbackResult = instance.process([mockFallbackInput], [mockFallbackOutput]);

            expect(fallbackResult).toBe(true);
            expect(mockFallbackOutput[0][0]).toBeCloseTo(0.7); // Mono pass-through
            expect(mockFallbackOutput[1][0]).toBeCloseTo(0.7);

        } else {
            throw new Error('processorClass is null');
        }
    });
});
