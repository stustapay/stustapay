from fastapi import APIRouter, status, HTTPException

from stustapay.core.http.auth_till import CurrentAuthToken
from stustapay.core.http.context import ContextTillService
from stustapay.core.schema.customer import Customer

router = APIRouter(
    prefix="/customer",
    tags=["customer"],
    responses={404: {"description": "Not found"}},
)


@router.get("/{customer_tag_uid}", summary="Obtain a customer by tag uid", response_model=Customer)
async def get_customer(
    token: CurrentAuthToken,
    customer_tag_uid: int,
    till_service: ContextTillService,
):
    customer = await till_service.get_customer(token=token, customer_tag_uid=customer_tag_uid)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return customer
