#!/usr/bin/env bash
set -euo pipefail
test_image="$1"
repository="$2"
gateway_launcher="$(command -v mprlab-gateway)"
gateway_runtime="$(mprlab-gateway version --json | python3 -c 'import json, pathlib, sys; metadata=json.load(sys.stdin); root=pathlib.Path(sys.argv[1]).resolve().parent; print(root / "releases" / metadata["version"] / metadata["platform"] / "runtime")' "$gateway_launcher")"
gateway_executable="$gateway_runtime/bin/mprlab-gateway"
gateway_ansible="$(dirname "$gateway_runtime")/toolchain/bin/ansible-playbook"
fixture="$(mktemp -d "${TMPDIR:-/tmp}/allergy-gateway-contract.XXXXXX")"
fixture="$(cd "$fixture" && pwd -P)"
trap 'rm -rf "$fixture"' EXIT

# Generate requests through the application adapter in Docker at host-visible paths.
docker run --rm --init --volume "$fixture:$fixture" \
    --env "ALLERGY_TEST_GATEWAY_FIXTURE=$fixture" "$test_image" node tests/release-adapter.mjs
for platform in android ios; do
    set +e
    env -i PATH="$PATH" HOME="$HOME" \
        MPRLAB_GATEWAY_EXECUTABLE="$gateway_executable" \
        MPRLAB_APPLICATION_LIFECYCLE_LOCK=exclusive MPRLAB_LIFECYCLE_OPERATION=release \
        "$gateway_executable" mobile-build-operation < "$fixture/$platform.json" > "$fixture/$platform.log" 2>&1
    result=$?
    set -e
    if [ "$result" = 0 ] || ! rg -q '^mobile build requires an absolute MPRLAB_MOBILE_BUILD_INTENT$' "$fixture/$platform.log"; then
        cat "$fixture/$platform.log" >&2
        exit 1
    fi
done

# Use the installed contract validator; it checks the actual selected declaration.
cat > "$fixture/manifest.yml" <<'YAML'
---
- hosts: localhost
  gather_facts: false
  vars_files:
    - "{{ lookup('env', 'ALLERGY_GATEWAY_RUNTIME') }}/deploy/ansible/playbooks/vars/app-lifecycle-contract.yml"
  vars:
    mprlab_resource: "{{ (lookup('file', lookup('env', 'ALLERGY_REPOSITORY') + '/.mprlab/deploy/resources.yml') | from_yaml).mprlab_resources.resources.mobile | combine({'id': 'mobile'}) }}"
  tasks:
    - ansible.builtin.include_tasks: "{{ lookup('env', 'ALLERGY_GATEWAY_RUNTIME') }}/deploy/ansible/playbooks/tasks/validate-selected-app-resource.yml"
YAML
ALLERGY_GATEWAY_RUNTIME="$gateway_runtime" ALLERGY_REPOSITORY="$repository" \
    "$gateway_ansible" --inventory localhost, --connection local "$fixture/manifest.yml"
printf '%s\n' 'Installed Gateway accepted both request schemas and the mobile declaration. No build intent or signing operation was created.'
