from fastapi import Request, status
from fastapi.responses import JSONResponse

from stustapay.core.service.common.error import NotFound, ServiceException, AccessDenied

# these exception messages are parsed in the frontends


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


def exception_handler(request: Request, exc: Exception):
    del request, exc
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "type": "internal",
            "message": "Internal Server Error",
        },
    )
