from fastapi import Request, status
from fastapi.responses import JSONResponse

from stustapay.core.service.common.error import NotFound, ServiceException, AccessDenied, Unauthorized


def not_found_exception_handler(request: Request, exc: NotFound):
    del request
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "type": "notfound",
            "id": exc.id,
            "element_typ": exc.element_typ,
            "element_id": exc.element_id,
            "message": str(exc),
        },
    )


def service_exception_handler(request: Request, exc: ServiceException):
    del request
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "type": "service",
            "id": exc.id,
            "message": str(exc),
        },
    )


def access_exception_handler(request: Request, exc: AccessDenied):
    del request
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "type": "access",
            "id": exc.id,
            "message": str(exc),
        },
    )


def unauthorized_exception_handler(request: Request, exc: Unauthorized):
    del request
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "type": "unauthorized",
            "id": exc.id,
            "message": str(exc),
        },
    )


def bad_request_exception_handler(request: Request, exc: Exception):
    del request
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "type": "service",
            "id": exc.__class__.__name__,
            "message": str(exc),
        },
    )


def exception_handler(request: Request, exc: Exception):
    del request
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "type": "internal",
            "id": exc.__class__.__name__,
            "message": "Internal Server Error",
        },
    )
