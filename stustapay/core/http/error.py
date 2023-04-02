from fastapi import Request, status
from fastapi.responses import JSONResponse

from stustapay.core.service.common.error import NotFoundException, ServiceException


def not_found_exception_handler(request: Request, exc: NotFoundException):
    del request
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "id": exc.id,
            "description": exc.description,
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
            "id": exc.id,
            "description": exc.description,
            # TODO add other exc fields
        },
    )


def exception_handler(request: Request, exc: Exception):
    del request, exc
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "Internal Server Error"})
