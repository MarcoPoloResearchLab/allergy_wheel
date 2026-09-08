// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runNativeBuild } from '../scripts/native-build-process.mjs';
const root = await mkdtemp(join(tmpdir(), 'native-process-'));
try {
    const source = join(root, 'mobile-build-operation');
    await writeFile(source, `let text='';process.stdin.on('data',data=>text+=data);process.stdin.on('end',()=>{if(!JSON.parse(text).platform)process.exit(22);process.exit(Number(process.env.FIXTURE_EXIT));});`);
    for (const status of [0, 47]) {
        assert.equal(await runNativeBuild(process.execPath, { source_root: root, platform: 'ios' }, { ...process.env, FIXTURE_EXIT: String(status) }), status);
    }
    await writeFile(source, `const {spawn}=require('node:child_process');const {writeFileSync}=require('node:fs');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)']);writeFileSync('ready',String(child.pid));setInterval(()=>{},1000);`);
    const controller = new AbortController();
    const running = runNativeBuild(process.execPath, { source_root: root, platform: 'ios' }, process.env, controller.signal);
    let childPid;
    for (let attempt = 0; attempt < 100; attempt += 1) {
        try { childPid = Number(await readFile(join(root, 'ready'), 'utf8')); break; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(childPid, 'Native process must report readiness');
    controller.abort('SIGTERM');
    assert.equal(await running, 143);
    for (let attempt = 0; attempt < 100; attempt += 1) {
        try { process.kill(childPid, 0); }
        catch (error) { assert.equal(error.code, 'ESRCH'); childPid = undefined; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(childPid, undefined, 'Interruption must stop native descendants');
    console.info('Native subprocess forwarding preserves failures and terminates the native process group.');
} finally {
    await rm(root, { recursive: true, force: true });
}
