/**
 * Remote Logger Utility
 * Pipes console logs to a local Node.js server for debugging in the terminal.
 */

const SERVER_URL = 'http://localhost:3001';

interface LogData {
    level: 'log' | 'warn' | 'error' | 'debug' | 'info';
    message: string;
    context?: string;
    timestamp: string;
}

const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    info: console.info,
};

let contextName = 'Renderer';

// Attempt to detect context
if (typeof (globalThis as any).AudioWorkletProcessor !== 'undefined') {
    contextName = 'AudioWorklet';
} else if (typeof (globalThis as any).WorkerGlobalScope !== 'undefined' || typeof (globalThis as any).importScripts !== 'undefined') {
    contextName = 'Worker';
}

let isServerAvailable = true;
let nextRetryTime = 0;

async function sendRemoteLog(level: LogData['level'], args: any[]) {
    if (!isServerAvailable && Date.now() < nextRetryTime) {
        return; // Circuit breaker active, avoid console spam
    }

    const message = args
        .map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        })
        .join(' ');

    const logData: LogData = {
        level,
        message,
        context: contextName,
        timestamp: new Date().toISOString(),
    };

    try {
        // We use a non-blocking fetch
        fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData),
            mode: 'cors',
        }).then(() => {
            isServerAvailable = true;
        }).catch(() => {
            // Ignore errors if server is down to avoid infinite loops or noise
            isServerAvailable = false;
            nextRetryTime = Date.now() + 5000; // Wait 5 seconds before trying again
        });
    } catch (err) {
        // Ignore
    }
}

export function initRemoteLogger() {
    console.log = (...args: any[]) => {
        originalConsole.log(...args);
        sendRemoteLog('log', args);
    };

    console.warn = (...args: any[]) => {
        originalConsole.warn(...args);
        sendRemoteLog('warn', args);
    };

    console.error = (...args: any[]) => {
        originalConsole.error(...args);
        sendRemoteLog('error', args);
    };

    console.debug = (...args: any[]) => {
        originalConsole.debug(...args);
        sendRemoteLog('debug', args);
    };

    console.info = (...args: any[]) => {
        originalConsole.info(...args);
        sendRemoteLog('info', args);
    };

    console.log(`[RemoteLogger] Initialized in ${contextName} context`);
}
