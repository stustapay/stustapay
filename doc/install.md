# StuStaPay Installation

## Development setup

### Devcontainers

You can use vscode's [development containers](https://containers.dev/),
we've included a configuration file in the repo root.

After starting the devcontainer you can simply start up the core services and the web uis.

### Manual

Install the python requirements
```shell
pip install -e '.[dev,test]'
```

Setup for each component:
- [core server](core.md#setup)
- [web uis](web.md#setup)
- TODO...

## Production setup

TODO :)
