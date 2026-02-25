import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const LOG_FILE = path.join(PROJECT_ROOT, 'browser.log');

const PORT = 3001;

// Clear log file on startup
fs.writeFileSync(LOG_FILE, `--- LOG STARTED AT ${new Date().toISOString()} ---\n`);

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { level, message, context, timestamp } = data;

                const timestampStr = timestamp || new Date().toISOString();
                const contextStr = context ? `[${context}]` : '';
                const logEntry = `${timestampStr} ${level.toUpperCase()} ${contextStr}: ${message}\n`;

                process.stdout.write(logEntry);
                fs.appendFileSync(LOG_FILE, logEntry);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                console.error('Error parsing log data:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Remote logger server listening on http://localhost:${PORT}`);
    console.log(`Logs will be written to ${LOG_FILE}`);
});
