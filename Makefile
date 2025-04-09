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

.PHONY: generate-openapi
generate-openapi:
	python3 -m stustapay -c ./etc/config.yaml customerportal-api --show-openapi > api/customer_portal.json
	python3 -m stustapay -c ./etc/config.yaml administration-api --show-openapi > api/administration.json
	python3 -m stustapay -c ./etc/config.yaml terminalserver-api --show-openapi > api/terminalserver.json
