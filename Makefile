.PHONY: test
test:
	uv run pytest stustapay --doctest-modules --cov=stustapay

.PHONY: check-format
check-format:
	uv run ruff format --check

.PHONY: format
format:
	uv run ruff format

.PHONY: lint
lint: ruff pylint mypy

.PHONY: pylint
pylint:
	uv run pylint stustapay

.PHONY: mypy
mypy:
	uv run mypy stustapay

.PHONY: ruff
ruff:
	uv run ruff check

.PHONY: ruff-fix
ruff-fix:
	uv run ruff check --fix

.PHONY: generate-openapi
generate-openapi:
	uv run stustapay -c ./etc/config.yaml customerportal-api --show-openapi > api/customer_portal.json
	uv run stustapay -c ./etc/config.yaml administration-api --show-openapi > api/administration.json
	uv run stustapay -c ./etc/config.yaml terminalserver-api --show-openapi > api/terminalserver.json

.PHONY: sync-contract
sync-contract: generate-openapi
	cd web && npx nx run administration:generate-openapi
	cd web && npx nx run customerportal:generate-openapi
	cd app && ./gradlew api
	$(MAKE) sync-contract-precommit

CONTRACT_PATHS = \
	api \
	app/api \
	web/apps/administration/src/api/generated \
	web/apps/administration/src/db/api/generated \
	web/apps/customerportal/src/api/generated

.PHONY: sync-contract-precommit
sync-contract-precommit:
	files="$$( { \
		git diff --name-only --diff-filter=ACMR -- $(CONTRACT_PATHS); \
		git diff --cached --name-only --diff-filter=ACMR -- $(CONTRACT_PATHS); \
		git ls-files --others --exclude-standard -- $(CONTRACT_PATHS); \
	} | sort -u )"; \
	if [ -n "$$files" ]; then \
		echo "$$files" | xargs uv run pre-commit run --files; \
		echo "$$files" | xargs uv run pre-commit run --files; \
	fi
