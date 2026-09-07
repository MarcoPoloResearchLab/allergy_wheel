#!/usr/bin/env bash
set -euo pipefail
mobile_repository=$(cd "$(dirname "$0")/.." && pwd)
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [ ! -d "$ANDROID_HOME" ]; then
    echo 'Android build requires ANDROID_HOME to select an installed Android SDK.' >&2
    exit 1
fi
cd "$mobile_repository/mobile/android"
bash gradlew :app:assembleDebug --no-daemon --console=plain
mkdir -p "$mobile_repository/artifacts/android"
cp app/build/outputs/apk/debug/app-debug.apk "$mobile_repository/artifacts/android/allergy-wheel-development.apk"

node "$mobile_repository/scripts/record-mobile-artifact.mjs" "$mobile_repository/artifacts/android/allergy-wheel-development.apk"
