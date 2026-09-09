// @ts-check
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobile = resolve(root, "mobile");
const require = createRequire(resolve(mobile, "package.json"));
const packaged = spawnSync(process.execPath, [resolve(root, "scripts/build-mobile-game.mjs")], { cwd: root, stdio: "inherit" });
assert.equal(packaged.status, 0, "The game must be reconstructed from the selected source");
const project = require("xcode").project(resolve(mobile, "ios/AllergyWheel.xcodeproj/project.pbxproj"));
project.parseSync();
const phases = Object.entries(project.hash.project.objects.PBXShellScriptBuildPhase)
  .filter(([id, phase]) => !id.endsWith("_comment") && phase.name === '"Bundle React Native code and images"');
assert.equal(phases.length, 1);
const script = JSON.parse(phases[0][1].shellScript);
assert.doesNotMatch(script, /@expo\/cli|expo\/scripts\/resolveAppEntry|export:embed/);
const output = mkdtempSync(resolve(tmpdir(), "allergy-apple-bundle-"));
try {
  mkdirSync(resolve(output, "AllergyWheel.app"));
  const env = {
    ...process.env, CI: "1", NODE_ENV: "production", EXPO_NO_TELEMETRY: "1",
    PROJECT_DIR: resolve(mobile, "ios"), CONFIGURATION: "Release", PLATFORM_NAME: "iphoneos",
    CONFIGURATION_BUILD_DIR: output, UNLOCALIZED_RESOURCES_FOLDER_PATH: "AllergyWheel.app",
    PODS_ROOT: resolve(mobile, "ios/Pods"), USE_HERMES: "false", NODE_BINARY: process.execPath,
    SOURCEMAP_FILE: resolve(output, "main.map"), EXTRA_PACKAGER_ARGS: "--max-workers 2",
    SKIP_BUNDLING: "",
  };
  const result = spawnSync("/bin/sh", ["-c", script], {
    cwd: mobile, env,
    stdio: "inherit",
  });
  assert.equal(result.status, 0, "The production native bundle phase must succeed");
  const bundle = readFileSync(resolve(output, "AllergyWheel.app/main.jsbundle"), "utf8");
  assert.match(bundle, /__DEV__=false/);
  const map = JSON.parse(readFileSync(resolve(output, "main.map"), "utf8"));
  assert.ok(map.sources.some((/** @type {string} */ source) => /(?:^|\/)App\.js$/.test(source)));
  assert.ok(map.sources.some((/** @type {string} */ source) => /(?:^|\/)index\.js$/.test(source)));
  assert.ok(map.sources.some((source) => /generated\/game\.json$/.test(source)));
  console.info("allergy_apple_production_bundle.ok");
} finally {
  rmSync(output, { recursive: true, force: true });
}
