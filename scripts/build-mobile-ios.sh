#!/usr/bin/env bash
set -euo pipefail
mobile_repository=$(cd "$(dirname "$0")/.." && pwd)
cd "$mobile_repository/mobile/ios"
pod install
xcodebuild -quiet -workspace AllergyWheel.xcworkspace -scheme AllergyWheel -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath "$mobile_repository/artifacts/ios" CODE_SIGNING_ALLOWED=NO build

node "$mobile_repository/scripts/record-mobile-artifact.mjs" "$mobile_repository/artifacts/ios/Build/Products/Release-iphonesimulator/AllergyWheel.app"
