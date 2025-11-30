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
