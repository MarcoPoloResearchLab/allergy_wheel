#!/usr/bin/env bash
set -euo pipefail
mobile_test_image="$1"
mobile_repository="$2"
mobile_container=$(docker create --env CI=1 --workdir /native "$mobile_test_image" bash -c 'npm ci && npm run prepare:native')
trap 'docker rm -f "$mobile_container" >/dev/null' EXIT
docker cp "$mobile_repository/mobile/package.json" "$mobile_container:/native/package.json"
docker cp "$mobile_repository/mobile/package-lock.json" "$mobile_container:/native/package-lock.json"
docker cp "$mobile_repository/mobile/app.json" "$mobile_container:/native/app.json"
docker cp "$mobile_repository/mobile/plugins" "$mobile_container:/native/plugins"
docker start --attach "$mobile_container"
mobile_exit_code=$(docker inspect --format '{{.State.ExitCode}}' "$mobile_container")
if [ "$mobile_exit_code" != 0 ]; then exit "$mobile_exit_code"; fi
docker cp "$mobile_container:/native/android" "$mobile_repository/mobile/"
docker cp "$mobile_container:/native/ios" "$mobile_repository/mobile/"
