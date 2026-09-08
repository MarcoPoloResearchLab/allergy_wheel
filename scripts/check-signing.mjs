// @ts-check
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { withAppleSigning, executeSigningTool } from './apple-signing.mjs';
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const app = JSON.parse(await readFile(join(repositoryRoot, 'mobile/app.json'), 'utf8')).expo;
const controller = new AbortController();
const interrupt = () => controller.abort();
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
try {
    await withAppleSigning({ repositoryRoot, applicationIdentifier: app.ios.bundleIdentifier, signal: controller.signal }, async signing => {
        const directory = await mkdtemp(join(tmpdir(), 'allergy-signing-check-'));
        try {
            const source = join(directory, 'main.c');
            const binary = join(directory, 'signing-check');
            await writeFile(source, 'int main(void) { return 0; }\n');
            for (const [name, args] of [
                ['xcrun', ['clang', source, '-o', binary]],
                ['codesign', ['--force', '--sign', signing.environment.ALLERGY_WHEEL_APPLE_IDENTITY, '--keychain', JSON.parse(signing.environment.ALLERGY_WHEEL_APPLE_KEYCHAIN), binary]],
                ['codesign', ['--verify', '--strict', binary]]
            ]) {
                const result = await executeSigningTool(name, args);
                if (result.status !== 0) throw new Error(`Native signing qualification failed at ${name} (status ${result.status}).`);
            }
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
    process.stdout.write('Apple signing succeeded with repository credentials. Temporary signing state was removed.\n');
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
} finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
}
