from fastapi import Request


def get_config(request: Request):
    return request.state.config
