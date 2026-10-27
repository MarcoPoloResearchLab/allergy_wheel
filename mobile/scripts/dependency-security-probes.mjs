// @ts-check
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { readFileSync, realpathSync, readdirSync, statSync, lstatSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";


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

/** Locate every Forge copy in the actual dependency installation. */
export function installedForgeCopies(root) {
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
        if (item.name === 'node-forge' && directoryEntry) selected.push(path.relative(root, location).split(path.sep).join('/'));
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, '..');
  const installations = installedForgeCopies(root);
  assert.ok(installations.length, 'Forge must be installed');
  for (const relative of installations) verifyInstalledForge(path.join(root, relative));
  verifyExpoConsumers(root);
  console.log('mobile_node_forge_security.ok: every installed copy and actual Expo certificate consumers');
}
