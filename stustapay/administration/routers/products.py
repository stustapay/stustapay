from fastapi import APIRouter, Depends, HTTPException, status

from stustapay.core.http.auth import get_current_user
from stustapay.core.http.context import get_product_service
from stustapay.core.schema.product import Product, NewProduct
from stustapay.core.schema.user import User
from stustapay.core.service.product import ProductService

router = APIRouter(
    prefix="/products",
    tags=["products"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=list[Product])
async def list_products(
    user: User = Depends(get_current_user), product_service: ProductService = Depends(get_product_service)
):
    return await product_service.list_products(user=user)


@router.post("/", response_model=Product)
async def create_product(
    product: NewProduct,
    user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service),
):
    return await product_service.create_product(user=user, product=product)


@router.get("/{product_id}", response_model=Product)
async def get_product(
    product_id: int,
    user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service),
):
    product = await product_service.get_product(user=user, product_id=product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return product


@router.post("/{product_id}", response_model=Product)
async def update_product(
    product_id: int,
    product: NewProduct,
    user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service),
):
    product = await product_service.update_product(user=user, product_id=product_id, product=product)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return product


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    user: User = Depends(get_current_user),
    product_service: ProductService = Depends(get_product_service),
):
    deleted = await product_service.delete_product(user=user, product_id=product_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
