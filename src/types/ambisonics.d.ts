declare module 'ambisonics' {
    export class binDecoder {
        constructor(audioCtx: AudioContext, order: number);
        in: ChannelSplitterNode;
        out: ChannelMergerNode;
        resetFilters(): void;
        updateFilters(audioBuffer: AudioBuffer): void;
    }

    export class HRIRloader_ircam {
        constructor(context: AudioContext, order: number, callback: (buffer: AudioBuffer) => void);
        load(url: string): void;
    }

    export class HRIRloader_local {
        constructor(context: AudioContext, order: number, callback: (buffer: AudioBuffer) => void);
        load(url: string): void;
    }
}
