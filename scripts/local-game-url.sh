#!/usr/bin/env bash
set -euo pipefail

container_id=${1:?The local game container ID is required.}
address=$(docker inspect --format '{{range (index .NetworkSettings.Ports "8000/tcp")}}{{.HostIp}}:{{.HostPort}}{{end}}' "$container_id")
if [[ ! "$address" =~ ^127\.0\.0\.1:([1-9][0-9]*)$ ]]; then
    printf 'Invalid local game address: %s\n' "$address" >&2
    exit 1
fi
printf 'http://%s\n' "$address"
