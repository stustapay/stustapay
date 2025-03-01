.PHONY: test
test:
	pytest stustapay --doctest-modules --cov=stustapay

.PHONY: check-format
check-format:
	ruff format --check

.PHONY: format
format:
	ruff format

.PHONY: lint
lint: ruff pylint mypy

.PHONY: pylint
pylint:
	pylint stustapay

.PHONY: mypy
mypy:
	mypy stustapay

.PHONY: ruff
ruff:
	ruff check

.PHONY: ruff-fix
ruff-fix:
	ruff check --fix

.PHONY: generate-openapi
generate-openapi:
	python3 -m stustapay -c config.yaml customerportal-api --show-openapi > api/customer_portal.json
	python3 -m stustapay -c config.yaml administration-api --show-openapi > api/administration.json
	python3 -m stustapay -c config.yaml terminalserver-api --show-openapi > api/terminalserver.json
