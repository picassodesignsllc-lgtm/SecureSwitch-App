import { cp, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

await exec(process.execPath, ['--check', 'src/app.js'], { stdio: 'inherit' });
await rm('build', { recursive: true, force: true });
await mkdir('build/dist', { recursive: true });
await cp('index.html', 'build/dist/index.html');
await cp('src', 'build/dist/src', { recursive: true });
