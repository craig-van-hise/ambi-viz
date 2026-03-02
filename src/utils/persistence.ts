/**
 * Lightweight localStorage persistence for AmbiViz user settings.
 * Debounced saves prevent excessive writes during slider drags.
 */

const STORAGE_KEY = 'ambiviz-settings';

export interface PersistedState {
    hrtfUrl: string;
    insideGain: number;
    outsideGain: number;
    eskf: {
        tau: number;
        R_scalar: number;
        Q_scalar: number;
    };
    visualParams: {
        densityThreshold: number;
        densityMult: number;
        emissionMult: number;
        heatmapKnee: number;
        edgeFalloff: number;
        dissipationRate: number;
    };
}

const DEFAULTS: PersistedState = {
    hrtfUrl: '/hrtf/MIT_KEMAR_Normal.sofa',
    insideGain: 3.0,
    outsideGain: 3.0,
    eskf: {
        tau: 0.125, // 125 ms
        R_scalar: 0.000938, // 9.38e-4
        Q_scalar: 0.25,
    },
    visualParams: {
        densityThreshold: 0,
        densityMult: 1.0,
        emissionMult: 1.0,
        heatmapKnee: 0.5,
        edgeFalloff: 1.0,
        dissipationRate: 0,
    },
};

/** Load persisted state, falling back to defaults for missing keys */
export function loadState(): PersistedState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULTS };
        const parsed = JSON.parse(raw);
        // Handle migration from old 'gain'
        const insideGain = parsed.insideGain ?? (parsed.gain !== undefined ? parsed.gain : DEFAULTS.insideGain);
        const outsideGain = parsed.outsideGain ?? DEFAULTS.outsideGain;
        return {
            hrtfUrl: parsed.hrtfUrl ?? DEFAULTS.hrtfUrl,
            insideGain,
            outsideGain,
            eskf: {
                tau: parsed.eskf?.tau ?? DEFAULTS.eskf.tau,
                R_scalar: parsed.eskf?.R_scalar ?? DEFAULTS.eskf.R_scalar,
                Q_scalar: parsed.eskf?.Q_scalar ?? DEFAULTS.eskf.Q_scalar,
            },
            visualParams: {
                densityThreshold: parsed.visualParams?.densityThreshold ?? DEFAULTS.visualParams.densityThreshold,
                densityMult: parsed.visualParams?.densityMult ?? DEFAULTS.visualParams.densityMult,
                emissionMult: parsed.visualParams?.emissionMult ?? DEFAULTS.visualParams.emissionMult,
                heatmapKnee: parsed.visualParams?.heatmapKnee ?? DEFAULTS.visualParams.heatmapKnee,
                edgeFalloff: parsed.visualParams?.edgeFalloff ?? DEFAULTS.visualParams.edgeFalloff,
                dissipationRate: parsed.visualParams?.dissipationRate ?? DEFAULTS.visualParams.dissipationRate,
            },
        };
    } catch {
        return { ...DEFAULTS };
    }
}

/** Save state to localStorage */
export function saveState(state: PersistedState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Silently fail — localStorage may be full or disabled
    }
}

/** Debounced save — coalesces rapid changes (e.g. slider drags) */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSave(state: PersistedState, delayMs = 300): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveState(state);
        saveTimer = null;
    }, delayMs);
}
