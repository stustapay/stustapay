.PHONY: test
test:
	pytest . --doctest-modules --cov=stustapay

.PHONY: check-format
check-format:
	isort --check-only .
	black --check .

.PHONY: format
format:
	isort .
	black .

.PHONY: lint
lint: pylint mypy

.PHONY: pylint
pylint:
	pylint stustapay

.PHONY: mypy
mypy:
	mypy .

.PHONY: generate-openapi
generate-openapi:
	python3 -m stustapay -c config.yaml customerportal-api --show-openapi > api/customer_portal.json
	python3 -m stustapay -c config.yaml administration-api --show-openapi > api/administration.json
	python3 -m stustapay -c config.yaml terminalserver-api --show-openapi > api/terminalserver.json
