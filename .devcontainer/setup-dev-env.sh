#!/usr/bin/env bash

pip install -e '.[dev,test]'
python -m stustapay -c etc/config.devel.yaml database migrate

pushd web
npm install
popd