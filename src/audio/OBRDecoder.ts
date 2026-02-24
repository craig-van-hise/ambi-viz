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
            const fetchResponse = await fetch('/obr.wasm');
            if (!fetchResponse.ok) {
                throw new Error(`Failed to fetch /obr.wasm: ${fetchResponse.statusText}`);
            }
            const wasmBinary = await fetchResponse.arrayBuffer();

            // 2. Add Worklet module (needs type: 'module' since obr-processor.js uses ES6 imports)
            await this.ctx.audioWorklet.addModule('/worklets/obr-processor.js', { type: 'module' } as any);

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

    public async loadSofa(url: string): Promise<void> {
        if (!this.workletNode) {
            throw new Error('OBRDecoder: WorkletNode is not initialized');
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch SOFA: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            this.workletNode.port.postMessage({ type: 'LOAD_SOFA', payload: buffer });
            console.log(`OBRDecoder: Sent LOAD_SOFA message for ${url}`);
        } catch (error) {
            console.error('OBRDecoder: Failed to load SOFA file:', error);
            throw error;
        }
    }
}
