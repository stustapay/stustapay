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
	mypy stustapay