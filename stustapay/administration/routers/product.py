from fastapi import APIRouter, HTTPException, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextProductService
from stustapay.core.schema.product import Product, NewProduct
from stustapay.core.service.common.decorators import OptionalUserContext

router = APIRouter(
    prefix="/products",
    tags=["products"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[Product])
async def list_products(token: CurrentAuthToken, product_service: ContextProductService):
    return await product_service.list_products(OptionalUserContext(token=token))


@router.post("", response_model=Product)
async def create_product(
    product: NewProduct,
    token: CurrentAuthToken,
    product_service: ContextProductService,
):
    return await product_service.create_product(OptionalUserContext(token=token), product=product)


@router.get("/{product_id}", response_model=Product)
async def get_product(
    product_id: int,
    token: CurrentAuthToken,
    product_service: ContextProductService,
):
    product = await product_service.get_product(OptionalUserContext(token=token), product_id=product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return product


@router.post("/{product_id}", response_model=Product)
async def update_product(
    product_id: int,
    product: NewProduct,
    token: CurrentAuthToken,
    product_service: ContextProductService,
):
    product = await product_service.update_product(
        OptionalUserContext(token=token), product_id=product_id, product=product
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return product


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    token: CurrentAuthToken,
    product_service: ContextProductService,
):
    deleted = await product_service.delete_product(OptionalUserContext(token=token), product_id=product_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
