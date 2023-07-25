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
	python3 -m stustapay.customer_portal -c config.yaml api --show-openapi > api/customer_portal.json
	python3 -m stustapay.administration -c config.yaml api --show-openapi > api/administration.json
	python3 -m stustapay.terminalserver -c config.yaml api --show-openapi > api/terminalserver.json
