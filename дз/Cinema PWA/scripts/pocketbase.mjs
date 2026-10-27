import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));

export function startDatabase() {
  const directory = path.join(root, 'pocketbase');
  const executable = path.join(directory, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
  if (!existsSync(executable)) throw new Error(`Не найден сервер PocketBase: ${executable}`);
  return spawn(executable, ['serve', '--http=127.0.0.1:8093'], {
    cwd: directory, stdio: 'inherit', windowsHide: true,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const child = startDatabase();
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.on('exit', code => { process.exitCode = code ?? 0; });
    process.on('SIGINT', () => child.kill());
    process.on('SIGTERM', () => child.kill());
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
