SHELL := /bin/bash
.DEFAULT_GOAL := help
.NOTPARALLEL:

REPOSITORY_DIRECTORY := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
LOCAL_PORT ?= 8765
COMPOSE_PROJECT_NAME ?= allergy-wheel-local
export LOCAL_PORT
COMPOSE = docker compose --env-file /dev/null --project-name "$(COMPOSE_PROJECT_NAME)" --file "$(REPOSITORY_DIRECTORY)/compose.local.yml"
TEST_IMAGE = $(COMPOSE_PROJECT_NAME)-tests:local

LOAD_SIGNING_INPUT = unset ALLERGY_WHEEL_ANDROID_KEYSTORE ALLERGY_WHEEL_ANDROID_STORE_PASSWORD \
    ALLERGY_WHEEL_ANDROID_KEY_ALIAS ALLERGY_WHEEL_ANDROID_KEY_PASSWORD \
    ALLERGY_WHEEL_APPLE_TEAM ALLERGY_WHEEL_APPLE_PROFILE ALLERGY_WHEEL_APPLE_IDENTITY \
    ALLERGY_WHEEL_APPLE_KEYCHAIN ALLERGY_WHEEL_APPLE_CERTIFICATE_PATH \
    ALLERGY_WHEEL_APPLE_CERTIFICATE_PASSWORD ALLERGY_WHEEL_APPLE_PROFILE_PATH; \
    set -a; source "$(REPOSITORY_DIRECTORY)/configs/.env.allergy-wheel"; set +a;

.PHONY: help up down check test test-local ci build-test-image

help:
	@printf '%s\n' 'make up          Start the game at http://127.0.0.1:8765' 'make down        Stop the local game' 'make test        Run browser tests in Docker' 'make test-local  Verify local startup and shutdown' 'make check       Validate source, JSON, Compose, and whitespace' 'make ci          Run all validation and integration tests' 'Set LOCAL_PORT to choose a different local port.'

up:
	$(COMPOSE) up --detach --wait --wait-timeout 60 web
	@printf 'Game: %s\n' "$$(bash scripts/local-game-url.sh "$$($(COMPOSE) ps --quiet web)")"

down:
	$(COMPOSE) down

build-test-image:
	docker build --file "$(REPOSITORY_DIRECTORY)/Dockerfile.tests" --tag "$(TEST_IMAGE)" "$(REPOSITORY_DIRECTORY)"

check: build-test-image
	$(COMPOSE) config --quiet
	bash -n "$(REPOSITORY_DIRECTORY)/tests/local-commands.sh"
	bash -n "$(REPOSITORY_DIRECTORY)/scripts/local-game-url.sh"
	git -C "$(REPOSITORY_DIRECTORY)" diff --check
	docker run --rm --init "$(TEST_IMAGE)" node scripts/check-source.mjs

test: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" npm test

test-local:
	bash "$(REPOSITORY_DIRECTORY)/tests/local-commands.sh"

ci: check test test-mobile mobile-check mobile-audit test-pages test-store-listings test-native-release test-release-adapter test-native-preparation test-local

.PHONY: test-mobile mobile-dependencies mobile-prepare

test-mobile: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node tests/mobile-flow.mjs

mobile-dependencies: build-test-image
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY):/workspace" --workdir /workspace/mobile "$(TEST_IMAGE)" npm ci

mobile-prepare: build-test-image
	bash scripts/prepare-mobile.sh "$(TEST_IMAGE)" "$(REPOSITORY_DIRECTORY)"

.PHONY: mobile-prepare-store
mobile-prepare-store: mobile-prepare mobile-package
	cd mobile/ios && pod install
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY):/workspace" "$(TEST_IMAGE)" node scripts/record-native-preparation.mjs

.PHONY: mobile-audit
mobile-audit: build-test-image
	docker run --rm --init --workdir /workspace/mobile "$(TEST_IMAGE)" npm audit --omit=dev

.PHONY: mobile-package mobile-check
mobile-package: build-test-image
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/mobile/generated:/workspace/mobile/generated" "$(TEST_IMAGE)" node scripts/build-mobile-game.mjs

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

.PHONY: store-listings test-store-listings verify-store-pages verify-feedback
.PHONY: store-artwork
store-artwork: build-test-image
	mkdir -p artifacts/store-artwork
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/artifacts/store-artwork:/output" "$(TEST_IMAGE)" node scripts/prepare-store-artwork.mjs /output

store-listings: build-test-image
	mkdir -p artifacts/store-listings
	docker run --rm --init --volume "$(REPOSITORY_DIRECTORY)/artifacts/store-listings:/output" "$(TEST_IMAGE)" node scripts/prepare-store-listings.mjs --output /output

test-store-listings: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/store-listings.mjs

verify-store-pages: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node scripts/verify-store-pages.mjs

verify-feedback: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" node scripts/verify-feedback.mjs

release publish deploy:
	@set -e; \
	application_root="$$(git rev-parse --show-toplevel)"; \
	gateway_root="$$(dirname "$${application_root}")/mprlab-gateway"; \
	if [ ! -d "$${gateway_root}" ]; then \
		printf "required sibling gateway is missing: %s; clone mprlab-gateway at exactly %s\n" \
			"$${gateway_root}" "$${gateway_root}" >&2; \
		exit 2; \
	fi; \
	if [ "$@" = release ]; then \
		$(LOAD_SIGNING_INPUT) \
	fi; \
	$(MAKE) --no-print-directory -C "$${gateway_root}" "app-$@" \
		MPRLAB_APP_ROOT="$${application_root}"

.PHONY: test-native-release
test-native-release: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/native-release.mjs

.PHONY: test-release-adapter
test-release-adapter: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/release-adapter.mjs
	docker run --rm --init "$(TEST_IMAGE)" node tests/release-entrypoint.mjs
	docker run --rm --init "$(TEST_IMAGE)" node tests/portable-signing.mjs
	docker run --rm --init "$(TEST_IMAGE)" node tests/native-build-process.mjs

.PHONY: test-native-preparation
test-native-preparation: build-test-image
	docker run --rm --init "$(TEST_IMAGE)" node tests/native-preparation.mjs

.PHONY: check-signing
check-signing:
	@set -e; $(LOAD_SIGNING_INPUT) node "$(REPOSITORY_DIRECTORY)/scripts/check-signing.mjs"
