from fastapi import APIRouter, Depends, HTTPException, status

from stustapay.core.http.auth_user import get_auth_token
from stustapay.core.http.context import get_product_service
from stustapay.core.schema.product import Product, NewProduct
from stustapay.core.service.product import ProductService

router = APIRouter(
    prefix="/products",
    tags=["products"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Product])
async def list_products(
    token: str = Depends(get_auth_token), product_service: ProductService = Depends(get_product_service)
):
    return await product_service.list_products(token=token)


@router.post("/", response_model=Product)
async def create_product(
    product: NewProduct,
    token: str = Depends(get_auth_token),
    product_service: ProductService = Depends(get_product_service),
):
    return await product_service.create_product(token=token, product=product)


@router.get("/{product_id}", response_model=Product)
async def get_product(
    product_id: int,
    token: str = Depends(get_auth_token),
    product_service: ProductService = Depends(get_product_service),
):
    product = await product_service.get_product(token=token, product_id=product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return product


@router.post("/{product_id}", response_model=Product)
async def update_product(
    product_id: int,
    product: NewProduct,
    token: str = Depends(get_auth_token),
    product_service: ProductService = Depends(get_product_service),
):
    product = await product_service.update_product(token=token, product_id=product_id, product=product)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return product


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    token: str = Depends(get_auth_token),
    product_service: ProductService = Depends(get_product_service),
):
    deleted = await product_service.delete_product(token=token, product_id=product_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
