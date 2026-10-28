// @ts-check
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { readFileSync, realpathSync, readdirSync, statSync, lstatSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tmpdir } from "node:os";


/** Verify one explicitly selected installed package through its real RSA public API. */
export function verifyInstalledForge(installation) {
  const consumerRequire = createRequire(path.join(installation, "package.json"));
  const consumer = installation;
const nativeKeys = generateKeyPairSync("rsa", { modulusLength: 2048, publicExponent: 3 });
const pem = {
  privateKeyPEM: nativeKeys.privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
  publicKeyPEM: nativeKeys.publicKey.export({ type: "pkcs1", format: "pem" }).toString(),
};
const message = "Allergy Wheel RSA signature boundary";
  const entry = consumerRequire.resolve(installation);
  const selectedRoot = realpathSync(installation);
  const inside = path.relative(selectedRoot, realpathSync(entry));
  assert.ok(inside && !inside.startsWith("..") && !path.isAbsolute(inside), "entry must belong to the selected installation");
  const forge = consumerRequire(entry);
  const identityPath = path.join(installation, "package.json");
  const identity = JSON.parse(readFileSync(identityPath, "utf8"));
  const { asn1 } = forge;
  const keys = {
    privateKey: forge.pki.privateKeyFromPem(pem.privateKeyPEM),
    publicKey: forge.pki.publicKeyFromPem(pem.publicKeyPEM),
  };
  /** @param {Asn1[]} children @returns {Asn1} */
  const sequence = (children) => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, children);
  /** @param {string} value @returns {Asn1} */
  const oid = (value) => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(value).getBytes());
  /** @param {string} value @returns {Asn1} */
  const octets = (value) => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, value);
  const nullParameter = (value = "") => asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, value);

  for (const algorithm of ["sha256", "md5"]) {
    const digest = forge.md[algorithm].create().update(message).digest().getBytes();
    // Sign crafted DigestInfo bytes. Verification always uses its normal public API.
    /** @param {Asn1[]} parameters @param {Asn1[]} [outerElements] */
    const signature = (parameters, outerElements = []) => keys.privateKey.sign(
      asn1.toDer(sequence([
        sequence([oid(forge.oids[algorithm]), ...parameters]), octets(digest), ...outerElements,
      ])).getBytes(), "NONE",
    );
    assert.equal(keys.publicKey.verify(digest, signature([nullParameter()])), true, `${consumer}: valid ${algorithm}`);
    if (algorithm === "sha256") {
      assert.equal(keys.publicKey.verify(digest, signature([])), true, `${consumer}: SHA-256 without NULL`);
    } else {
      assert.throws(() => keys.publicKey.verify(digest, signature([])), /Missing algorithm identifier NULL parameters/);
    }
    /** @type {[string, Asn1[], Asn1[]][]} */
    const malformed = [
      ["extra nested element after NULL", [nullParameter(), octets("garbage")], []],
      ["extra nested element without NULL", [octets("garbage")], []],
      ["nonempty NULL", [nullParameter("garbage")], []],
      ["extra outer element", [nullParameter()], [octets("garbage")]],
    ];
    for (const [name, parameters, outerElements] of malformed) {
      assert.throws(
        () => keys.publicKey.verify(digest, signature(parameters, outerElements)),
        /ASN\.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value/,
        `${consumer}: ${algorithm} accepted ${name}`,
      );
    }
    const wrongDigest = forge.md[algorithm].create().update(`${message} changed`).digest().getBytes();
    assert.equal(keys.publicKey.verify(wrongDigest, signature([nullParameter()])), false);
  }

  assert.equal(identity.name, "node-forge", `${consumer}: upstream package identity`);
  assert.equal(identity.version, "1.4.0");
}

/** Locate every selected package copy in the actual dependency installation. */
function installedPackageCopies(root, packageName) {
  const selected = [];
  const active = new Set();
  const visit = (directory) => {
    const physical = realpathSync(directory);
    assert.ok(!active.has(physical), `Cyclic linked dependency directory: ${directory}`);
    active.add(physical);
    try {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        if (item.name === '.bin') continue;
        const location = path.join(directory, item.name);
        const directoryEntry = item.isDirectory() || (item.isSymbolicLink() && statSync(location).isDirectory());
        if (item.name === packageName && directoryEntry) selected.push(path.relative(root, location).split(path.sep).join('/'));
        if (!directoryEntry) continue;
        if (item.name.startsWith('@')) visit(location);
        else {
          const children = path.join(location, 'node_modules');
          try { lstatSync(children); }
          catch (error) { if (error.code === 'ENOENT') continue; throw error; }
          visit(children);
        }
      }
    } finally { active.delete(physical); }
  };
  visit(path.join(root, 'node_modules'));
  return selected.sort();
}

/** Locate every installed Forge package. */
export const installedForgeCopies = root => installedPackageCopies(root, 'node-forge');
/** Locate every installed deepmerge package. */
export const installedDeepmergeCopies = root => installedPackageCopies(root, 'deepmerge');

/** Qualify the actual Expo consumers and certificate operations. */
export function verifyExpoConsumers(root) {
  const require = createRequire(path.join(root, "package.json"));
  const expoRequire = createRequire(require.resolve("expo/package.json"));
  const cliRequire = createRequire(expoRequire.resolve("@expo/cli/package.json"));
  const certificatePath = cliRequire.resolve("@expo/code-signing-certificates/package.json");
  const certificateRequire = createRequire(certificatePath);
  const roots = new Set();
  for (const consumer of [cliRequire, certificateRequire]) {
    const installation = path.dirname(consumer.resolve("node-forge/package.json"));
    verifyInstalledForge(installation);
    roots.add(realpathSync(installation));
  }
  assert.equal(roots.size, 1, "Expo consumers must use the selected corrected Forge");
const nativeKeys = generateKeyPairSync("rsa", { modulusLength: 2048, publicExponent: 3 });
const pem = {
  privateKeyPEM: nativeKeys.privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
  publicKeyPEM: nativeKeys.publicKey.export({ type: "pkcs1", format: "pem" }).toString(),
};
const message = "Allergy Wheel RSA signature boundary";
const certificates = cliRequire("@expo/code-signing-certificates");
const keys = certificates.convertKeyPairPEMToKeyPair(pem);
const now = Date.now();
const certificate = certificates.generateSelfSignedCodeSigningCertificate({
  keyPair: keys,
  validityNotBefore: new Date(now - 60_000),
  validityNotAfter: new Date(now + 3_600_000),
  commonName: "Allergy Wheel security test",
});
const parsed = certificates.convertCertificatePEMToCertificate(certificates.convertCertificateToCertificatePEM(certificate));
certificates.validateSelfSignedCertificate(parsed, keys);
const signed = certificates.signBufferRSASHA256AndVerify(keys.privateKey, parsed, Buffer.from(message));
assert.equal(verify("sha256", Buffer.from(message), nativeKeys.publicKey, Buffer.from(signed, "base64")), true);
assert.equal(certificates.convertCSRPEMToCSR(certificates.convertCSRToCSRPEM(certificates.generateCSR(keys, "Allergy Wheel test"))).verify(), true);

}

/** Qualify the installed CJS and UMD public entry points without source-index imports. */
export function verifyInstalledDeepmerge(installation) {
  const require = createRequire(path.join(installation, 'package.json'));
  const identity = require(path.join(installation, 'package.json'));
  assert.equal(identity.name, 'deepmerge');
  assert.equal(identity.version, '4.3.1');
  const selectedRoot = realpathSync(installation);
  for (const entry of [require.resolve(installation), path.join(installation, 'dist/umd.js')]) {
    const relative = path.relative(selectedRoot, realpathSync(entry));
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'deepmerge entry must belong to the selected installation');
    const merge = require(entry);
    const payload = () => JSON.parse('{"__proto__":{"allergyPoisoned":true},"ordinary":{"value":1}}');
    const safe = (value) => {
      assert.equal(Object.getPrototypeOf(value), Object.prototype, `${entry}: result prototype changed`);
      assert.equal(Object.hasOwn(value, '__proto__'), false);
      assert.equal(value.allergyPoisoned, undefined);
      assert.equal({}.allergyPoisoned, undefined);
    };
    safe(merge(Object.create(null), payload()));
    safe(merge(payload(), {}));
    safe(merge({ __proto__: null, ordinary: null }, payload()));
    safe(merge(JSON.parse('{"__proto__":null}'), payload()));
    const array = merge([], [payload()]);
    safe(array[0]);
    safe(merge({}, { nested: payload() }).nested);
    safe(merge({ nested: null }, { nested: payload() }).nested);
    assert.deepEqual(merge({ nested: { first: 1 }, items: [1] }, { nested: { second: 2 }, items: [2] }),
      { nested: { first: 1, second: 2 }, items: [1, 2] });
    const symbol = Symbol('ordinary');
    assert.equal(merge({}, { [symbol]: 3 })[symbol], 3);
    const original = { nested: { value: 1 } };
    const cloned = merge({}, original);
    assert.notEqual(cloned.nested, original.nested);
    assert.equal(merge({}, original, { clone: false }).nested, original.nested);
    assert.deepEqual(merge({ items: [1] }, { items: [2] }, { arrayMerge: (_target, source) => source }), { items: [2] });
    assert.deepEqual(merge({ count: 1 }, { count: 2 }, { customMerge: key => key === 'count' ? (left, right) => left + right : undefined }), { count: 2 });
    assert.deepEqual(merge({ nested: { count: 1 } }, { nested: { count: 2 } },
      { customMerge: key => key === 'nested' ? (left, right) => ({ count: left.count + right.count }) : undefined }), { nested: { count: 3 } });
    assert.deepEqual(merge.all([{ first: 1 }, { second: 2 }]), { first: 1, second: 2 });
  }
}

/** Qualify actual installed Expo and React Native resolution and public configuration APIs. */
export async function verifyDeepmergeConsumers(root) {
  const require = createRequire(path.join(root, 'package.json'));
  const selected = realpathSync(path.dirname(require.resolve('deepmerge/package.json')));
  for (const name of ['@expo/config', '@react-native-community/cli', '@react-native-community/cli-config', '@react-native-community/cli-doctor']) {
    const consumer = createRequire(require.resolve(`${name}/package.json`));
    const installation = path.dirname(consumer.resolve('deepmerge/package.json'));
    assert.equal(realpathSync(installation), selected, `${name} must resolve the selected correction`);
    verifyInstalledDeepmerge(installation);
  }
  const fixture = mkdtempSync(path.join(tmpdir(), 'allergy-deepmerge-consumers-'));
  let primaryError;
  try {
    writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ name: 'allergy-deepmerge-fixture', version: '1.0.0' }));
    writeFileSync(path.join(fixture, 'app.json'), JSON.stringify({ expo: { name: 'Fixture', slug: 'fixture', extra: { first: 1 } } }));
    const expo = require('@expo/config');
    const result = await expo.modifyConfigAsync(fixture, { extra: { second: 2 } }, { skipSDKVersionRequirement: true });
    assert.equal(result.type, 'success');
    assert.deepEqual(result.config.extra, { first: 1, second: 2 });
    writeFileSync(path.join(fixture, 'react-native.config.js'), 'module.exports = { assets: ["fixture-assets"] };\n');
    const native = await require('@react-native-community/cli-config').loadConfigAsync({ projectRoot: fixture });
    assert.deepEqual(native.assets, ['fixture-assets']);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try { rmSync(fixture, { recursive: true, force: true }); }
    catch (cleanupError) {
      if (primaryError) throw new AggregateError([primaryError, cleanupError], 'Consumer qualification and fixture cleanup failed');
      throw cleanupError;
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, '..');
  if (process.argv[2] === '--deepmerge') {
    verifyInstalledDeepmerge(path.join(root, 'node_modules/deepmerge'));
    await verifyDeepmergeConsumers(root);
    console.log('mobile_deepmerge_security.ok: CJS, UMD, Expo and React Native consumers');
    process.exit(0);
  }
  const installations = installedForgeCopies(root);
  assert.ok(installations.length, 'Forge must be installed');
  for (const relative of installations) verifyInstalledForge(path.join(root, relative));
  verifyExpoConsumers(root);
  console.log('mobile_node_forge_security.ok: every installed copy and actual Expo certificate consumers');
  const mergeInstallations = installedDeepmergeCopies(root);
  assert.ok(mergeInstallations.length, 'deepmerge must be installed');
  for (const relative of mergeInstallations) verifyInstalledDeepmerge(path.join(root, relative));
  await verifyDeepmergeConsumers(root);
  console.log('mobile_deepmerge_security.ok: every installed copy, CJS, UMD and actual Expo/RN consumers');
}
