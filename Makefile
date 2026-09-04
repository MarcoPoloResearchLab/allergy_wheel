SHELL := /bin/bash
.DEFAULT_GOAL := help
.NOTPARALLEL:

REPOSITORY_DIRECTORY := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
LOCAL_PORT ?= 8765
COMPOSE_PROJECT_NAME ?= allergy-wheel-local
export LOCAL_PORT
COMPOSE = docker compose --env-file /dev/null --project-name "$(COMPOSE_PROJECT_NAME)" --file "$(REPOSITORY_DIRECTORY)/compose.local.yml"
TEST_IMAGE = $(COMPOSE_PROJECT_NAME)-tests:local

.PHONY: help up down check test test-local ci build-test-image

help:
	@printf '%s\n' 'make up          Start the game at http://127.0.0.1:8765' 'make down        Stop the local game' 'make test        Run browser tests in Docker' 'make test-local  Verify local startup and shutdown' 'make check       Validate source, JSON, Compose, and whitespace' 'make ci          Run all validation and integration tests' 'Set LOCAL_PORT to choose a different local port.'

up:
	$(COMPOSE) up --detach --wait --wait-timeout 60 web
	@printf 'Game: http://%s\n' "$$($(COMPOSE) port web 8000)"

down:
	$(COMPOSE) down

build-test-image:
	docker build --file "$(REPOSITORY_DIRECTORY)/Dockerfile.tests" --tag "$(TEST_IMAGE)" "$(REPOSITORY_DIRECTORY)"

check: build-test-image
	$(COMPOSE) config --quiet
	bash -n "$(REPOSITORY_DIRECTORY)/tests/local-commands.sh"
	git -C "$(REPOSITORY_DIRECTORY)" diff --check
	docker run --rm --init "$(TEST_IMAGE)" node scripts/check-source.mjs

test: build-test-image
	docker run --rm --init --shm-size=1g "$(TEST_IMAGE)" npm test

test-local:
	bash "$(REPOSITORY_DIRECTORY)/tests/local-commands.sh"

ci: check test test-local
