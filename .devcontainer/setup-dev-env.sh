#!/usr/bin/env bash

pip install -e '.[dev,test]'
cp .devcontainer/config.sample.yml config.devcontainer.yml
python -m stustapay.core -c config.devcontainer.yml database rebuild
python -m stustapay.core -c config.devcontainer.yml database add_data

pushd web
npm install
popd