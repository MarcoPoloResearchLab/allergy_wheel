#!/usr/bin/env bash
set -euo pipefail
test_image="$1"
repository="$2"
: "${MPRLAB_GATEWAY_TEST_ARCHIVE:?Select the published Gateway archive for this container platform}"
: "${MPRLAB_GATEWAY_TEST_VERSION:?Select the exact published Gateway version}"
docker run --rm --init --interactive \
    --volume "$MPRLAB_GATEWAY_TEST_ARCHIVE:/gateway-runtime.tar.gz:ro" \
    --volume "$repository/Makefile:/workspace/Makefile:ro" \
    --volume "$repository/tests:/workspace/tests:ro" \
    --volume "$repository/scripts:/workspace/scripts:ro" \
    --env MPRLAB_GATEWAY_TEST_VERSION "$test_image" bash -se <<'CONTAINER'
seed="$(mktemp -d)"
install="$(mktemp -d)"
trap 'rm -rf "$seed" "$install"' EXIT
mkdir -p "$install/application/.mprlab/deploy"
cat > "$install/application/.mprlab/deploy/resources.yml" <<'MANIFEST'
mprlab_resources:
  owner: allergy-runtime-fixture
  inputs:
    synthetic: fixture
  ci:
    enabled: false
  release:
    scheme: semver
  defaults:
    timeouts:
      startup: 30s
      completion: 1m
      readiness: 30s
      request: 30s
      shutdown: 30s
  resources:
    private:
      kind: private_values
      bindings:
        synthetic: synthetic
MANIFEST
tar -xzf /gateway-runtime.tar.gz -C "$seed"
"$seed/bin/mprlab-gateway" install --version "$MPRLAB_GATEWAY_TEST_VERSION" \
    --archive /gateway-runtime.tar.gz --repo-root "$install/application" \
    --install-root "$install/install" --bin-root "$install/bin" --cache-root "$install/cache" > "$install/identity.json"
MPRLAB_GATEWAY_EXECUTABLE="$(node --input-type=module - "$install/identity.json" "$install/install" <<'IDENTITY'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const identity = JSON.parse(readFileSync(process.argv[2], 'utf8'));
assert.equal(identity.version, process.env.MPRLAB_GATEWAY_TEST_VERSION);
assert.match(identity.platform, /^linux-(amd64|arm64)$/);
process.stdout.write(join(process.argv[3], 'releases', identity.version, identity.platform, 'runtime/bin/mprlab-gateway'));
IDENTITY
)"
export MPRLAB_GATEWAY_EXECUTABLE
node tests/release-entrypoint.mjs --captured-adapter
runtime="$(dirname "$(dirname "$MPRLAB_GATEWAY_EXECUTABLE")")"
export ALLERGY_GATEWAY_RUNTIME="$runtime"
node --input-type=module - "$runtime/internal/manifest/schema.json" "$install/schema.json" <<'SCHEMA'
import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync(process.argv[3], JSON.stringify({ mprlab_manifest_schema: JSON.parse(readFileSync(process.argv[2], 'utf8')) }));
SCHEMA
cat > "$install/manifest.yml" <<'PLAYBOOK'
---
- hosts: localhost
  gather_facts: false
  vars_files:
    - "{{ lookup('env', 'ALLERGY_GATEWAY_RUNTIME') }}/deploy/ansible/playbooks/vars/app-lifecycle-contract.yml"
  vars:
    mprlab_resource: "{{ (lookup('file', '/workspace/.mprlab/deploy/resources.yml') | from_yaml).mprlab_resources.resources.mobile | combine({'id': 'mobile'}) }}"
  tasks:
    - ansible.builtin.include_tasks: "{{ lookup('env', 'ALLERGY_GATEWAY_RUNTIME') }}/deploy/ansible/playbooks/tasks/validate-selected-app-resource.yml"
PLAYBOOK
"$MPRLAB_GATEWAY_EXECUTABLE" bootstrap-run --repo-root "$install/application" --operation app-release -- \
    "$(dirname "$runtime")/toolchain/bin/ansible-playbook" --inventory localhost, --connection local --extra-vars "@$install/schema.json" "$install/manifest.yml"
printf '%s\n' 'Installed Gateway accepted the current selected mobile declaration and both native request schemas.'
CONTAINER
