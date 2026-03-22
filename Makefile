.PHONY: test
test:
	python3 -m pytest stustapay --doctest-modules --cov=stustapay

.PHONY: check-format
check-format:
	python3 -m ruff format --check

.PHONY: format
format:
	python3 -m ruff format

.PHONY: lint
lint: ruff pylint mypy

.PHONY: pylint
pylint:
	pylint stustapay

.PHONY: mypy
mypy:
	python3 -m mypy stustapay

.PHONY: ruff
ruff:
	python3 -m ruff check

.PHONY: ruff-fix
ruff-fix:
	python3 -m ruff check --fix

.PHONY: dev
dev:
	python3 tools/dev.py

.PHONY: dev-backend
dev-backend:
	python3 tools/dev.py --backend-only

.PHONY: dev-web
dev-web:
	python3 tools/dev.py --web-only

.PHONY: verify-backend
verify-backend:
	$(MAKE) test
	$(MAKE) lint

.PHONY: verify-web-administration
verify-web-administration:
	cd web && npx nx run administration:lint
	cd web && npx nx run administration:test
	cd web && npx nx run administration:build

.PHONY: verify-web-customerportal
verify-web-customerportal:
	cd web && npx nx run customerportal:lint
	cd web && npx nx run customerportal:test
	cd web && npx nx run customerportal:build

.PHONY: verify-web
verify-web: verify-web-administration verify-web-customerportal

.PHONY: verify-android
verify-android:
	cd app && ./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug

.PHONY: generate-openapi
generate-openapi:
	python3 -m stustapay -c ./etc/config.yaml customerportal-api --show-openapi > api/customer_portal.json
	python3 -m stustapay -c ./etc/config.yaml administration-api --show-openapi > api/administration.json
	python3 -m stustapay -c ./etc/config.yaml terminalserver-api --show-openapi > api/terminalserver.json

.PHONY: sync-contract
sync-contract: generate-openapi
	cd web && npx nx run administration:generate-openapi
	cd web && npx nx run customerportal:generate-openapi
	cd app && ./gradlew api
