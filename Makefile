.PHONY: test
test:
	pytest . --doctest-modules --cov=stustapay

.PHONY: check-format
check-format:
	black --check .

.PHONY: lint
lint: pylint mypy

.PHONY: pylint
pylint:
	pylint stustapay

.PHONY: mypy
mypy:
	mypy stustapay