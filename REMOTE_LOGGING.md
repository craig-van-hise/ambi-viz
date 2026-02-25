# Remote Logging Feature

The project now includes a remote logging system to capture browser console output (Renderer, Workers, and AudioWorklets) into a local file and terminal. This is particularly useful for debugging as an AI agent.

## Components

- **Server**: `scripts/remote-logger-server.js` (Node.js HTTP server)
- **Client Utility**: `src/utils/remoteLogger.ts` (Console override)
- **Log File**: `browser.log` (Git-ignored)

## Usage

### 1. Start the Remote Logger Server
Run the following command in a separate terminal:
```bash
npm run remote-logs
```
The server listens on `http://localhost:3001` and writes logs to `browser.log`.

### 2. Run the Application
Start the Vite development server as usual:
```bash
npm run dev
```

### 3. Review Logs
Console logs from the browser will now appear in:
1. The terminal running `npm run remote-logs`.
2. The `browser.log` file in the project root.

## Architecture

The system works by overriding the global `console` object in the browser. Each log call (`log`, `warn`, `error`, etc.) is intercepted and sent via a non-blocking `fetch` POST request to the local Node.js server.

The utility attempts to detect its execution environment (Main thread, Web Worker, or AudioWorklet) and prefixes logs with `[Renderer]`, `[Worker]`, or `[AudioWorklet]` accordingly.
