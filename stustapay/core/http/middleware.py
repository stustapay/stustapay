from fastapi import FastAPI, Request


def add_context_middleware(app: FastAPI, config):
    @app.middleware("http")
    async def context_middleware(request: Request, call_next):
        request.state.config = config
        return await call_next(request)
