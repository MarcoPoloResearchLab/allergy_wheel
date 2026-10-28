SHELL := /bin/bash
.DEFAULT_GOAL := help
.NOTPARALLEL:

REPOSITORY_DIRECTORY := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
LOCAL_PORT ?= 8765
COMPOSE_PROJECT_NAME ?= allergy-wheel-local
export LOCAL_PORT
COMPOSE = docker compose --env-file /dev/null --project-name "$(COMPOSE_PROJECT_NAME)" --file "$(REPOSITORY_DIRECTORY)/compose.local.yml"
TEST_IMAGE = $(COMPOSE_PROJECT_NAME)-tests:local
DEPENDENCY_IMAGE = $(COMPOSE_PROJECT_NAME)-dependencies:local

MPRLAB_GATEWAY_EXECUTABLE ?= mprlab-gateway

.PHONY: help up down check test test-local ci build-test-image build-dependency-image

help:
	@printf '%s\n' 'make up          Start the game at http://127.0.0.1:8765' 'make down        Stop the local game' 'make test        Run browser tests in Docker' 'make test-local  Verify local startup and shutdown' 'make check       Validate source, JSON, Compose, and whitespace' 'make ci          Run all validation and integration tests' 'Set LOCAL_PORT to choose a different local port.'

up:
	$(COMPOSE) up --detach --no-recreate --wait --wait-timeout 60 web
	@printf 'Game: %s\n' "$$(bash scripts/local-game-url.sh "$$($(COMPOSE) ps --quiet web)")"

down:
	$(COMPOSE) down

build-dependency-image:
	docker build --file "$(REPOSITORY_DIRECTORY)/Dockerfile.tests" --target dependency-tools --tag "$(DEPENDENCY_IMAGE)" "$(REPOSITORY_DIRECTORY)"

build-test-image:
	docker build --file "$(REPOSITORY_DIRECTORY)/Dockerfile.tests" --tag "$(TEST_IMAGE)" "$(REPOSITORY_DIRECTORY)"

check: build-test-image
	$(COMPOSE) config --quiet
	bash -n "$(REPOSITORY_DIRECTORY)/tests/local-commands.sh"
	bash -n "$(REPOSITORY_DIRECTORY)/scripts/local-game-url.sh"
	bash -n "$(REPOSITORY_DIRECTORY)/tests/gateway-contract.sh"
	git -C "$(REPOSITORY_DIRECTORY)" diff --check
	docker run --rm --init "$(TEST_IMAGE)" node scripts/check-source.mjs

test: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" npm test

HARNESS_FIRST_FAILURE_CONTAINER ?= $(COMPOSE_PROJECT_NAME)-harness-first-failure

.PHONY: test-harness-first-failure
test-harness-first-failure: build-test-image
	docker run --rm --init --name "$(HARNESS_FIRST_FAILURE_CONTAINER)" --network none --shm-size=1g "$(TEST_IMAGE)" node tests/harness-first-failure.mjs

.PHONY: test-layout
test-layout: build-test-image
	mkdir -p artifacts/layout
	docker run --rm --init --shm-size=1g --volume "$(REPOSITORY_DIRECTORY)/artifacts/layout:/output" "$(TEST_IMAGE)" node tests/layout-flow.mjs

test-local:
	bash "$(REPOSITORY_DIRECTORY)/tests/local-commands.sh"

ci: check test-harness-first-failure test test-layout test-node-forge-security test-deepmerge-security test-dependency-audit test-dependency-installs test-mobile mobile-check mobile-audit test-pages test-store-listings test-feedback-verifier test-privacy test-native-release test-release-adapter test-native-preparation mobile-native-check test-apple-bundle test-local

.PHONY: test-mobile mobile-dependencies mobile-prepare

test-mobile: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node tests/mobile-flow.mjs

mobile-dependencies: build-test-image
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY):/workspace" --workdir /workspace/mobile "$(TEST_IMAGE)" npm ci

mobile-prepare: build-test-image
	bash scripts/prepare-mobile.sh "$(TEST_IMAGE)" "$(REPOSITORY_DIRECTORY)"

.PHONY: mobile-prepare-store
mobile-prepare-store: mobile-dependencies mobile-prepare mobile-package
	cd mobile/ios && pod install
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY):/workspace" "$(TEST_IMAGE)" node scripts/record-native-preparation.mjs
	$(MAKE) --no-print-directory test-podfile-config

.PHONY: mobile-audit
mobile-audit: build-test-image
	docker run --rm --init --workdir /workspace/mobile "$(TEST_IMAGE)" node scripts/audit-dependencies.mjs --omit=dev

.PHONY: mobile-package mobile-check
mobile-package: build-test-image
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/mobile/generated:/workspace/mobile/generated" "$(TEST_IMAGE)" node scripts/build-mobile-game.mjs

.PHONY: mobile-update-dependencies
mobile-update-dependencies: build-dependency-image
	docker run --rm --init --env CI=1 --volume "$(REPOSITORY_DIRECTORY):/workspace" --workdir /workspace/mobile "$(DEPENDENCY_IMAGE)" npm install --package-lock-only --ignore-scripts
	docker run --rm --init --env CI=1 --volume "$(REPOSITORY_DIRECTORY):/workspace" --workdir /workspace/mobile "$(DEPENDENCY_IMAGE)" npm ci
	docker run --rm --init --env CI=1 --volume "$(REPOSITORY_DIRECTORY):/workspace" --workdir /workspace/mobile --env EXPO_NO_DOTENV=1 --env EXPO_NO_TELEMETRY=1 "$(DEPENDENCY_IMAGE)" ./node_modules/.bin/expo install --fix

mobile-check: build-test-image
	docker run --rm --init --workdir /workspace/mobile --env CI=1 "$(TEST_IMAGE)" npm run check:expo

.PHONY: mobile-android mobile-ios
mobile-android: mobile-package
	bash scripts/build-mobile-android.sh

mobile-ios: mobile-package
	bash scripts/build-mobile-ios.sh

.PHONY: test-pages
test-pages: build-test-image
	@set -e; \
	pages_output="$$(mktemp -d "$${TMPDIR:-/tmp}/allergy-wheel-pages.XXXXXX")"; \
	trap 'rm -rf "$$pages_output"' EXIT; \
	docker build --file Dockerfile.pages --target pages --output "type=local,dest=$$pages_output" .; \
	docker run --rm --init --volume "$$pages_output:/publication:ro" "$(TEST_IMAGE)" node scripts/check-pages.mjs

.PHONY: install-android
install-android:
	"$${ANDROID_HOME:-$$HOME/Library/Android/sdk}/platform-tools/adb" install -r artifacts/android/allergy-wheel-development.apk

.PHONY: test-ios-simulator
test-ios-simulator:
	xcrun simctl install booted artifacts/ios/Build/Products/Release-iphonesimulator/AllergyWheel.app
	xcrun simctl launch --terminate-running-process booted com.mprlab.allergywheel

.PHONY: release publish deploy

.PHONY: store-listings test-store-listings test-feedback-verifier verify-store-pages verify-feedback
.PHONY: test-privacy privacy-disclosures verify-privacy
test-privacy: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node tests/privacy-contract.mjs

privacy-disclosures: build-test-image
	mkdir -p artifacts/privacy-disclosures
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/artifacts/privacy-disclosures:/output" "$(TEST_IMAGE)" node scripts/prepare-privacy-disclosures.mjs --output /output

verify-privacy: build-test-image
	mkdir -p artifacts/privacy-validation
	docker run --rm --init --shm-size=1g --volume "$(REPOSITORY_DIRECTORY)/artifacts/privacy-validation:/output" "$(TEST_IMAGE)" node scripts/verify-privacy.mjs --output /output/native-requests.json

.PHONY: store-artwork
store-artwork: build-test-image
	mkdir -p artifacts/store-artwork
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/artifacts/store-artwork:/output" "$(TEST_IMAGE)" node scripts/prepare-store-artwork.mjs /output

store-listings: build-test-image
	mkdir -p artifacts/store-listings
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/artifacts/store-listings:/output" "$(TEST_IMAGE)" node scripts/prepare-store-listings.mjs --output /output

test-store-listings: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/store-listings.mjs

test-feedback-verifier: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node tests/feedback-verifier.mjs

verify-store-pages: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node scripts/verify-store-pages.mjs

verify-feedback: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node scripts/verify-feedback.mjs

release publish deploy:
	@CI=1 "$(MPRLAB_GATEWAY_EXECUTABLE)" "app-$@" --app-root "$(REPOSITORY_DIRECTORY)" </dev/null

.PHONY: test-native-release
test-native-release: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/native-release.mjs

.PHONY: test-release-adapter
test-release-adapter: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/release-adapter.mjs
	docker run --rm --init "$(TEST_IMAGE)" node tests/release-entrypoint.mjs
	docker run --rm --init "$(TEST_IMAGE)" node tests/native-build-process.mjs

.PHONY: test-gateway-contract
test-gateway-contract: build-test-image
	bash tests/gateway-contract.sh "$(TEST_IMAGE)" "$(REPOSITORY_DIRECTORY)"

.PHONY: test-native-preparation test-native-preparation-contract mobile-native-check
mobile-native-check: build-test-image
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/mobile/ios:/workspace/mobile/ios:ro" --volume "$(REPOSITORY_DIRECTORY)/mobile/android:/workspace/mobile/android:ro" --workdir /workspace/mobile "$(TEST_IMAGE)" node scripts/verify-native-release.mjs

test-native-preparation: mobile-native-check test-native-preparation-contract

test-native-preparation-contract: build-test-image
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/mobile/ios:/workspace/mobile/ios:ro" --volume "$(REPOSITORY_DIRECTORY)/mobile/android:/workspace/mobile/android:ro" "$(TEST_IMAGE)" node tests/native-preparation.mjs
	docker run --rm --init "$(TEST_IMAGE)" node tests/native-preparation-command.mjs

.PHONY: test-apple-bundle
test-apple-bundle: build-test-image
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/mobile/ios/AllergyWheel.xcodeproj:/workspace/mobile/ios/AllergyWheel.xcodeproj:ro" "$(TEST_IMAGE)" node tests/apple-bundle.mjs

.PHONY: mobile-audit-build test-tooling-audit
mobile-audit-build: build-test-image
	docker run --rm --init --workdir /workspace/mobile "$(TEST_IMAGE)" node scripts/audit-dependencies.mjs

test-tooling-audit: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" npm audit

.PHONY: test-podfile-config
test-podfile-config:
	ruby tests/podfile-config.rb

.PHONY: test-node-forge-security
test-node-forge-security: build-test-image
	docker run --rm --init --workdir /workspace/mobile "$(TEST_IMAGE)" node scripts/dependency-security-probes.mjs

.PHONY: test-dependency-audit test-dependency-installs
test-dependency-audit: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/dependency-audit.mjs

test-dependency-installs: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/dependency-security.mjs

.PHONY: test-deepmerge-security
DEEPMERGE_SECURITY_CONTAINER ?= $(COMPOSE_PROJECT_NAME)-deepmerge-security
test-deepmerge-security: build-test-image
	docker run --rm --init --name "$(DEEPMERGE_SECURITY_CONTAINER)" --network none --workdir /workspace/mobile "$(TEST_IMAGE)" node scripts/dependency-security-probes.mjs --deepmerge

.PHONY: mobile-refresh-lock
mobile-refresh-lock: build-dependency-image
	docker run --rm --init --env CI=1 --volume "$(REPOSITORY_DIRECTORY):/workspace" --workdir /workspace/mobile "$(DEPENDENCY_IMAGE)" npm install --package-lock-only --ignore-scripts
