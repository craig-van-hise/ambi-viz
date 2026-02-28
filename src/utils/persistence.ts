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
}

const DEFAULTS: PersistedState = {
    hrtfUrl: '/hrtf/MIT_KEMAR_Normal.sofa',
    insideGain: 2.2,
    outsideGain: 7.2,
    eskf: {
        tau: 0.125, // 125 ms
        R_scalar: 0.000938, // 9.38e-4
        Q_scalar: 0.25,
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
