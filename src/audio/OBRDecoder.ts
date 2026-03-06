export class OBRDecoder {
    public in: GainNode;
    public out: GainNode;
    private ctx: AudioContext;
    private order: number;
    private workletNode: AudioWorkletNode | null = null;
    public isInitialized: boolean = false;

    constructor(ctx: AudioContext, order: number) {
        this.ctx = ctx;
        this.order = order;

        const numChannels = (this.order + 1) ** 2;

        this.in = this.ctx.createGain();
        this.in.channelCount = numChannels;
        this.in.channelCountMode = 'explicit';
        this.in.channelInterpretation = 'discrete';

        this.out = this.ctx.createGain();
    }

    public async init(): Promise<void> {
        try {
            // 1. Fetch WASM binary on the main thread
            // Load obr.wasm module using vite base URL for proper paths
            const fetchResponse = await fetch(`${import.meta.env.BASE_URL}obr.wasm`);
            if (!fetchResponse.ok) {
                throw new Error(`Failed to fetch ${import.meta.env.BASE_URL}obr.wasm: ${fetchResponse.statusText}`);
            }
            const wasmBinary = await fetchResponse.arrayBuffer();

            // 2. Load the AudioWorklet processor script
            await this.ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/obr-processor.js`, { type: 'module' } as any);

            const numChannels = (this.order + 1) ** 2;

            // 3. Instantiate Worklet and provide the fetched binary
            this.workletNode = new AudioWorkletNode(this.ctx, 'obr-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [2],
                processorOptions: {
                    order: this.order,
                    sampleRate: this.ctx.sampleRate,
                    wasmBinary: wasmBinary
                },
                channelCount: numChannels,
                channelCountMode: 'explicit',
                channelInterpretation: 'discrete'
            });

            this.in.connect(this.workletNode);
            this.workletNode.connect(this.out);

            this.isInitialized = true;
            console.log(`OBRDecoder: Initialized with order ${this.order} (${numChannels} channels)`);
        } catch (error) {
            this.isInitialized = false;
            console.error('OBRDecoder: Failed to initialize AudioWorklet:', error);
            throw error;
        }
    }

    public async loadSofa(urlOrBuffer: string | ArrayBuffer): Promise<void> {
        if (!this.workletNode) {
            throw new Error('OBRDecoder: WorkletNode is not initialized');
        }

        try {
            let buffer: ArrayBuffer;
            if (typeof urlOrBuffer === 'string') {
                const response = await fetch(urlOrBuffer);
                if (!response.ok) {
                    throw new Error(`Failed to fetch SOFA: ${response.statusText}`);
                }
                buffer = await response.arrayBuffer();
                console.log(`OBRDecoder: Fetched and loading SOFA from ${urlOrBuffer}`);
            } else {
                buffer = urlOrBuffer;
                console.log('OBRDecoder: Loading SOFA from provided ArrayBuffer');
            }
            this.workletNode.port.postMessage({ type: 'LOAD_SOFA', payload: buffer });
        } catch (error) {
            console.error('OBRDecoder: Failed to load SOFA file:', error);
            throw error;
        }
    }
}
