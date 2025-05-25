import uuid
from datetime import datetime

from stustapay.payment.sumup.api import (
    SumUpCheckout,
    SumUpCheckoutStatus,
    SumUpTransactionDetail,
    SumUpTransactionStatus,
)


class MockSumUpApi:
    amount: float = 0

    def __init__(self, api_key: str, merchant_code: str):
        del api_key
        self.merchant_code = merchant_code

    async def find_checkout(self, order_uuid: uuid.UUID) -> SumUpCheckout | None:
        return SumUpCheckout(
            amount=self.amount,
            checkout_reference=order_uuid,
            currency="EUR",
            description="",
            id=str(uuid.uuid4()),
            merchant_code=self.merchant_code,
            status=SumUpCheckoutStatus.PAID,
            date=datetime.now(),
        )

    async def find_transaction(self, order_uuid: uuid.UUID) -> SumUpTransactionDetail | None:
        return SumUpTransactionDetail(
            id=str(uuid.uuid4()),
            amount=self.amount,
            currency="EUR",
            foreign_transaction_id=str(order_uuid),
            timestamp=datetime.now(),
            payment_type="EC",
            product_summary="",
            card_type="EC",
            type="PAYMENT",
            status=SumUpTransactionStatus.SUCCESSFUL,
            transaction_code="asdfqweffyfd",
        )

    @classmethod
    def mock_amount(cls, amount: float):
        cls.amount = amount
