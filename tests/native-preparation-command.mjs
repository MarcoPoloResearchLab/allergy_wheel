// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = await mkdtemp(join(tmpdir(), 'native dependency preparation '));
try {
    await mkdir(join(root, 'mobile/ios'), { recursive: true });
    await copyFile(resolve('Makefile'), join(root, 'Makefile'));
    const stamp = join(root, 'installed-dependencies');
    await writeFile(stamp, 'stale');
    await writeFile(join(root, 'boundary.mk'), 'build-test-image mobile-prepare mobile-package:\n\t@true\n');
    // Keep the Make entry point real; control the dependency installer and native-tool boundaries.
    await writeFile(join(root, 'boundary.sh'), `
set -e
docker() {
    case " $* " in
        *" npm ci "*) printf locked > "$TEST_DEPENDENCY_STAMP" ;;
    esac
}
pod() {
    if [ "$(cat "$TEST_DEPENDENCY_STAMP")" != locked ]; then
        printf 'CocoaPods received stale host dependencies\\n' >&2
        return 74
    fi
    printf verified > "$TEST_DEPENDENCY_STAMP"
}
ruby() {
    if [ "$*" != 'tests/podfile-config.rb' ] || [ "$(cat "$TEST_DEPENDENCY_STAMP")" != verified ]; then
        printf 'CocoaPods configuration checks require completed native preparation\\n' >&2
        return 75
    fi
    printf configuration-verified > "$TEST_DEPENDENCY_STAMP"
}
export -f docker pod ruby
make --no-print-directory -f Makefile -f boundary.mk mobile-prepare-store
`);
    const result = spawnSync('bash', ['boundary.sh'], { cwd: root, env: { ...process.env, TEST_DEPENDENCY_STAMP: stamp }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(stamp, 'utf8'), 'configuration-verified');
    console.info('Native store preparation refreshes locked host dependencies before CocoaPods.');
} finally {
    await rm(root, { recursive: true, force: true });
}
