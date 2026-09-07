#!/usr/bin/env bash
set -euo pipefail

repository_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
test_project_name="allergy-wheel-command-test-$$"
compose_arguments=(--env-file /dev/null --project-name "$test_project_name" --file "$repository_directory/compose.local.yml")

run_make() {
    make --no-print-directory -C "$repository_directory" "COMPOSE_PROJECT_NAME=$test_project_name" LOCAL_PORT=0 "$@"
}

cleanup() {
    run_make down
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

run_make up
first_container_id=$(docker compose "${compose_arguments[@]}" ps --quiet web)
test_url=$(bash "$repository_directory/scripts/local-game-url.sh" "$first_container_id")
homepage=$(curl --fail --silent --show-error "$test_url/")
case "$homepage" in
    *"Allergy Wheel"*) ;;
    *) printf '%s\n' 'FAIL: the local server did not return the game page.' >&2; exit 1 ;;
esac

source_digest=$(shasum -a 256 "$repository_directory/js/core/app.js" | awk '{print $1}')
response_digest=$(curl --fail --silent --show-error "$test_url/js/core/app.js" | shasum -a 256 | awk '{print $1}')
test "$source_digest" = "$response_digest"
curl --fail --silent --show-error "$test_url/data/dishes.json" --output /dev/null

run_make up
second_container_id=$(docker compose "${compose_arguments[@]}" ps --quiet web)
test -n "$first_container_id"
test "$first_container_id" = "$second_container_id"

run_make down
remaining_containers=$(docker ps --all --quiet --filter "label=com.docker.compose.project=$test_project_name")
remaining_networks=$(docker network ls --quiet --filter "label=com.docker.compose.project=$test_project_name")
test -z "$remaining_containers"
test -z "$remaining_networks"
if curl --fail --silent --max-time 2 "$test_url/" --output /dev/null; then
    printf '%s\n' 'FAIL: the local server still responds after make down.' >&2
    exit 1
fi
run_make down
trap - EXIT
printf '%s\n' 'PASS: local startup, current source, repeated startup, shutdown, and repeated shutdown.'
