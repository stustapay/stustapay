from fastapi import APIRouter, HTTPException, Response, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextProductService
from stustapay.core.schema.product import NewProduct, Product

router = APIRouter(
    prefix="/products",
    tags=["products"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[Product])
async def list_products(
    token: CurrentAuthToken, response: Response, product_service: ContextProductService, node_id: int
):
    resp = await product_service.list_products(token=token, node_id=node_id)
    response.headers["Content-Range"] = str(len(resp))
    return resp


@router.post("", response_model=Product)
async def create_product(
    product: NewProduct, token: CurrentAuthToken, product_service: ContextProductService, node_id: int
):
    return await product_service.create_product(token=token, product=product, node_id=node_id)


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: int, token: CurrentAuthToken, product_service: ContextProductService, node_id: int):
    product = await product_service.get_product(token=token, product_id=product_id, node_id=node_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return product


@router.put("/{product_id}", response_model=Product)
async def update_product(
    product_id: int,
    product: NewProduct,
    token: CurrentAuthToken,
    product_service: ContextProductService,
    node_id: int,
):
    created_product = await product_service.update_product(
        token=token, product_id=product_id, product=product, node_id=node_id
    )
    if created_product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return created_product


@router.delete("/{product_id}")
async def delete_product(
    product_id: int, token: CurrentAuthToken, product_service: ContextProductService, node_id: int
):
    deleted = await product_service.delete_product(token=token, product_id=product_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
