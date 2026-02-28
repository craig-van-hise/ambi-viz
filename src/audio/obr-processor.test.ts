import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('OBRProcessor Registration', () => {
    it('should register obr-processor', async () => {
        const filePath = path.resolve(__dirname, '../../public/worklets/obr-processor.js');
        let code = fs.readFileSync(filePath, 'utf8');
        code = code.replace(/import ModuleFactory from '\.\.\/obr\.js';/g, '');

        // Mock globals
        let registeredName = '';
        type ProcessorConstructor = new (options: { processorOptions?: { order?: number; wasmBinary?: ArrayBuffer } }) => {
            order: number;
            numChannels: number;
        };
        let processorClass: ProcessorConstructor | null = null;

        const mockRegisterProcessor = (name: string, proc: ProcessorConstructor) => {
            registeredName = name;
            processorClass = proc;
        };

        class MockPort { onmessage = null; }

        class MockAudioWorkletProcessor {
            port = new MockPort();
        }

        const fn = new Function('AudioWorkletProcessor', 'registerProcessor', 'console', 'ModuleFactory', code);
        const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

        let resolveModuleFactory: (wasm: unknown) => void = () => { };
        const moduleFactoryPromise = new Promise(resolve => {
            resolveModuleFactory = resolve;
        });
        const mockModuleFactory = vi.fn().mockReturnValue(moduleFactoryPromise);

        fn(MockAudioWorkletProcessor, mockRegisterProcessor, mockConsole, mockModuleFactory);

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

            const wasmMemory = new ArrayBuffer(1024 * 1024);
            const mockWasm = {
                _malloc: vi.fn((size) => size), // return size as dummy ptr
                _obr_init: vi.fn(),
                _obr_process: vi.fn(),
                memory: { buffer: wasmMemory },
                HEAPU8: new Uint8Array(wasmMemory),
                HEAPF32: new Float32Array(wasmMemory)
            };

            // Trigger ModuleFactory resolution to run setupWasm internally
            resolveModuleFactory(mockWasm);
            await moduleFactoryPromise;

            // Give the JS event loop a tick to resolve the .then callback
            await new Promise(r => setTimeout(r, 0));

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

            // Test SAB integration and rotation API
            const sab = new SharedArrayBuffer(128);
            const int32View = new Int32Array(sab);
            const float32View = new Float32Array(sab);

            const wasmWithExtras = mockWasm as unknown as {
                _malloc: { mockClear: () => void };
                _free: unknown;
                _obr_load_sofa: unknown;
                _obr_set_rotation: unknown;
            };
            wasmWithExtras._malloc.mockClear();
            wasmWithExtras._free = vi.fn();
            wasmWithExtras._obr_load_sofa = vi.fn();

            // Test LOAD_SOFA message (Verifies HEAPF32.buffer mapping fix)
            const dummySofaPayload = new ArrayBuffer(16);
            expect(() => {
                instance.handleMessage({ data: { type: 'LOAD_SOFA', payload: dummySofaPayload } });
            }).not.toThrow();
            expect(wasmWithExtras._malloc).toHaveBeenCalledWith(16);
            expect(wasmWithExtras._obr_load_sofa).toHaveBeenCalled();
            expect(wasmWithExtras._free).toHaveBeenCalled();

            // Send SAB to worklet
            instance.handleMessage({ data: { type: 'SET_SAB', payload: sab } });

            // Write mock decoupled audio tracking data (ADTRK) and UI data (ADUI)
            float32View[13] = 0.1; // QUAT_ADTRK_X
            float32View[14] = 0.2; // QUAT_ADTRK_Y
            float32View[15] = 0.3; // QUAT_ADTRK_Z
            float32View[16] = 0.4; // QUAT_ADTRK_W
            // Initialize Audio UI quaternion (ADUI) to identity 
            float32View[20] = 1.0; // QUAT_ADUI_W
            Atomics.store(int32View, 0, 1); // latest seq num = 1

            // Mock the set rotation method we expect to be in WASM
            const mockSetRotation = vi.fn();
            wasmWithExtras._obr_set_rotation = mockSetRotation;

            const rotationInputs = [Array.from({ length: 16 }, () => new Float32Array(128).fill(0.0))];
            const rotationOutputs = [Array.from({ length: 2 }, () => new Float32Array(128))];

            instance.process(rotationInputs, rotationOutputs);

            expect(mockSetRotation).toHaveBeenCalled();
            const args = mockSetRotation.mock.calls[0];
            // Output is (rw, -rx, -ry, -rz)
            expect(args[0]).toBeCloseTo(0.4, 5);   // rw
            expect(args[1]).toBeCloseTo(-0.1, 5);  // -rx
            expect(args[2]).toBeCloseTo(-0.2, 5);  // -ry
            expect(args[3]).toBeCloseTo(-0.3, 5);  // -rz

        } else {
            throw new Error('processorClass is null');
        }
    });
});
