import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { root, startDatabase } from './pocketbase.mjs';
import { startPushServer } from '../server/push.mjs';

function available(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error(`Порт ${port} занят. Остановите другой Cinema PWA или его терминал.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}

const preview = process.argv.includes('--preview');
const webPort = preview ? 4176 : 5176;
const children = [];
let stopping = false;
let push;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill();
  void push?.close();
  process.exitCode = code;
}

try {
  await available(8093);
  await available(webPort);
  await available(8094);
  const database = startDatabase();
  children.push(database);
  database.once('error', error => { console.error(error.message); stop(1); });
  database.once('exit', code => { if (!stopping) { console.error('PocketBase остановлен.'); stop(code || 1); } });
  let ready = false;
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:8093/api/health', { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* сервер применяет миграции */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('PocketBase не запустился. Проверьте сообщение выше.');
  if (!stopping) {
    push = await startPushServer();
    const web = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), ...(preview ? ['preview'] : [])], {
      cwd: root, stdio: 'inherit', windowsHide: true,
    });
    children.push(web);
    web.once('error', error => { console.error(error.message); stop(1); });
    web.once('exit', code => { if (!stopping) stop(code ?? 0); });
    console.log(`\nСайт: http://127.0.0.1:${webPort}/\nУправление базой: http://127.0.0.1:8093/_/\nДля остановки нажмите Ctrl+C.\n`);
  }
} catch (error) { console.error(error.message); stop(1); }

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
