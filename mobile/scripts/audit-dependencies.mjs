// @ts-check
import { spawnSync } from 'node:child_process';
import { readFile, realpath } from 'node:fs/promises';
import { verifyInstalledForge, installedForgeCopies, verifyInstalledDeepmerge, installedDeepmergeCopies } from './dependency-security-probes.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const fail = (message) => { throw new Error(`Dependency audit: ${message}`); };
const keys = (object, expected, subject) => {
  if (!object || Array.isArray(object) || typeof object !== 'object' ||
      Object.keys(object).sort().join() !== [...expected].sort().join()) fail(`${subject} schema is invalid.`);
};
const policy = await json('config/dependency-audit.json');
keys(policy, ['schema', 'reviewed_at', 'review_after', 'remediations'], 'policy');
if (policy.schema !== 'allergy-wheel.dependency-audit.v1' || (!Array.isArray(policy.remediations) || policy.remediations.length !== 2)) fail('policy schema is invalid.');
for (const field of ['reviewed_at', 'review_after']) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(policy[field]) || !Number.isFinite(Date.parse(policy[field]))) fail(`${field} is invalid.`);
}
if (Date.parse(policy.review_after) < Date.now() || policy.reviewed_at > policy.review_after) fail(`review expired or invalid (${policy.review_after}).`);
const lock = await json('package-lock.json');
if (lock.lockfileVersion !== 3 || !lock.packages) fail('lockfile schema is invalid.');
const corrections = new Map([
  ['GHSA-86w9-cpqp-85rv', { package: 'node-forge', version: '1.4.0', patch: 'RSA-CORRECTION.patch', upstream: 'https://github.com/digitalbazaar/forge/pull/1152', copies: installedForgeCopies, verify: verifyInstalledForge }],
  ['GHSA-gcqx-w48m-w2h4', { package: 'deepmerge', version: '4.3.1', patch: 'PROTOTYPE-CORRECTION.patch', upstream: 'https://github.com/TehShrike/deepmerge/pull/274', copies: installedDeepmergeCopies, verify: verifyInstalledDeepmerge }],
]);
const remediations = new Map();
const qualifiedLocations = new Map();
for (const entry of policy.remediations) {
  keys(entry, ['advisory', 'package', 'version', 'patch', 'upstream', 'installations'], 'remediation');
  keys(entry.upstream, ['pull_request'], 'upstream');
  const correction = corrections.get(entry.advisory);
  if (!correction || remediations.has(entry.advisory) ||
      entry.package !== correction.package || entry.version !== correction.version || entry.upstream.pull_request !== correction.upstream ||
      !Array.isArray(entry.installations) || entry.installations.length === 0 || new Set(entry.installations).size !== entry.installations.length ||
      entry.installations.some((location) => typeof location !== 'string' || !location.startsWith('node_modules/') || !location.endsWith(`node_modules/${entry.package}`) || location.includes('\\') || location.split('/').some((part) => !part || part === '.' || part === '..')) ||
      !/^https:\/\/github.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(entry.upstream.pull_request)) fail('remediation identity is invalid.');
  const patchPath = `vendor/${entry.package}/${correction.patch}`;
  if (entry.patch !== patchPath) fail(`${entry.advisory} patch path is invalid.`);
  await readFile(path.join(root, patchPath));
  const provenance = await json(`vendor/${entry.package}/PROVENANCE.json`);
  if (provenance.upstream_package !== entry.package || provenance.upstream_version !== entry.version ||
      provenance.advisory !== entry.advisory || provenance.upstream_fix_reference !== entry.upstream.pull_request ||
      provenance.review_after !== policy.review_after || provenance.source !== `https://registry.npmjs.org/${entry.package}/${entry.version}`) fail('local correction provenance differs.');
  const expected = Object.entries(lock.packages).filter(([location]) => location.endsWith(`node_modules/${entry.package}`));
  if (expected.some(([, value]) => (value.link ? lock.packages[value.resolved]?.version : value.version) !== entry.version) ||
      JSON.stringify(expected.map(([location]) => location).sort()) !== JSON.stringify([...entry.installations].sort())) fail(`${entry.advisory} lockfile installations differ.`);
  const locations = new Set(entry.installations);
  for (const location of entry.installations) {
    const selected = lock.packages[location];
    if (selected.link) {
      if (selected.resolved !== `vendor/${entry.package}` ||
          await realpath(path.join(root, location)) !== await realpath(path.join(root, selected.resolved))) fail('selected package link differs.');
      locations.add(selected.resolved);
    }
  }
  qualifiedLocations.set(entry.advisory, locations);
  const installed = correction.copies(root);
  if (JSON.stringify(installed.sort()) !== JSON.stringify([...entry.installations].sort())) fail(`${entry.advisory} installed copies differ.`);
  for (const location of entry.installations) {
    if ((await json(`${location}/package.json`)).version !== entry.version) fail(`${location} installed version differs.`);
    try { correction.verify(path.join(root, location)); }
    catch (error) { fail(`${location} behavior failed: ${error.message}`); }
  }
  remediations.set(entry.advisory, entry);
}
const result = spawnSync('npm', ['audit', '--json', ...process.argv.slice(2)], { cwd: root, encoding: 'utf8' });
if (result.error) throw result.error;
let report;
try { report = JSON.parse(result.stdout); } catch { fail('npm audit did not return JSON.'); }
if (![0, 1].includes(result.status) || report.error || report.auditReportVersion !== 2 ||
    !report.vulnerabilities || Array.isArray(report.vulnerabilities) || typeof report.vulnerabilities !== 'object' || !report.metadata?.vulnerabilities ||
    !Number.isInteger(report.metadata.vulnerabilities.total)) fail('npm audit failed or returned an invalid report.');
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const counts = report.metadata.vulnerabilities;
if ([...severities, 'total'].some((severity) => !Number.isInteger(counts[severity]) || counts[severity] < 0) ||
    severities.reduce((total, severity) => total + counts[severity], 0) !== counts.total ||
    Object.keys(report.vulnerabilities).length !== counts.total) fail('invalid vulnerability counts.');
if (report.metadata.vulnerabilities.critical > 0) fail('critical vulnerability found.');
const observed = new Set();
for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
  if (!Array.isArray(vulnerability.via) || !Array.isArray(vulnerability.nodes) || !severities.includes(vulnerability.severity) || vulnerability.severity === 'critical' || vulnerability.via.length === 0) fail(`invalid finding for ${name}.`);
  for (const cause of vulnerability.via) {
    if (typeof cause === 'string') {
      if (!Object.hasOwn(report.vulnerabilities, cause)) fail(`unknown transitive finding ${cause}.`);
      continue;
    }
    if (!cause || ['url', 'name', 'dependency', 'severity', 'range'].some((field) => typeof cause[field] !== 'string')) fail(`invalid advisory for ${name}.`);
    const url = new URL(cause.url);
    const id = url.pathname.split('/').at(-1);
    const remediation = remediations.get(id);
    if (url.origin !== 'https://github.com' || url.pathname !== `/advisories/${id}` || !remediation ||
        cause.name !== remediation.package || cause.dependency !== remediation.package || cause.severity === 'critical' ||
        !['low', 'moderate', 'high'].includes(cause.severity) ||
        vulnerability.nodes.some((node) => !qualifiedLocations.get(id).has(node))) fail(`unremediated advisory ${id} (${name}).`);
    observed.add(id);
    process.stdout.write(`Upstream finding ${id} (${cause.name}, ${cause.severity}) is locally remediated by behavior-qualified ${remediation.patch}.\n`);
  }
}
const resolved = new Set(Object.entries(report.vulnerabilities)
  .filter(([, finding]) => finding.via.some((cause) => typeof cause === 'object'))
  .map(([name]) => name));
let previousSize = -1;
while (previousSize !== resolved.size) {
  previousSize = resolved.size;
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    if (finding.via.some((cause) => typeof cause === 'string' && resolved.has(cause))) resolved.add(name);
  }
}
for (const name of Object.keys(report.vulnerabilities)) {
  if (!resolved.has(name)) fail(`unrooted or cyclic-only transitive finding ${name}.`);
}
if (report.metadata.vulnerabilities.total > 0 && observed.size === 0) fail('report findings contain no verified advisories.');
for (const [id, remediation] of remediations) {
  if (!observed.has(id)) process.stdout.write(`Behavior-qualified local correction ${remediation.patch} for ${remediation.package}@${remediation.version}: advisory ${id} is absent from the current registry report.\n`);
}
process.stdout.write(`Dependency audit passed: ${observed.size} observed behavior-qualified advisories; ${remediations.size - observed.size} behavior-qualified local corrections with absent advisories. Review through ${policy.review_after}.\n`);
