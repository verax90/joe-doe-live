// Drives a Chrome of my own over the DevTools protocol: evaluate a script in
// the studio's page, optionally taking screenshots while it runs.
// node cdp.mjs <script.js> [shots=0] [everyMs=200] [prefix]
import { readFileSync, writeFileSync } from 'node:fs';
const [, , file, shots = '0', every = '200', prefix = 'frame'] = process.argv;
const port = 9333;
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((p) => p.type === 'page' && p.url.includes('localhost'));
if (!page) throw new Error('no studio page: ' + pages.map((p) => p.url).join(', '));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const waiting = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  }
};
const send = (method, params = {}) => new Promise((res) => { const n = ++id; waiting.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
const expression = `(async () => { ${readFileSync(file, 'utf8')} })()`;
const running = send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
const dir = `${process.cwd()}/`; // frames land where it is run from
for (let i = 0; i < Number(shots); i++) {
  await new Promise((r) => setTimeout(r, Number(every)));
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  writeFileSync(`${dir}${prefix}-${String(i).padStart(2, '0')}.jpg`, Buffer.from(shot.result.data, 'base64'));
}
const out = await running;
if (out.result.exceptionDetails) console.log('EXCEPTION', JSON.stringify(out.result.exceptionDetails.exception?.description ?? out.result.exceptionDetails).slice(0, 600));
else console.log(JSON.stringify(out.result.result.value));
ws.close();
