import uuid
from datetime import datetime

from stustapay.payment.sumup.api import (
    SumUpCheckout,
    SumUpCheckoutStatus,
    SumUpCreateCheckout,
    SumUpTransaction,
    SumUpTransactionDetail,
    SumUpTransactionStatus,
)


class MockSumUpApi:
    amount: float = 0
    checkouts: list[SumUpCheckout] = []
    transactions: list[SumUpTransaction] = []

    def __init__(self, api_key: str, merchant_code: str):
        del api_key
        self.merchant_code = merchant_code

    @classmethod
    def reset(cls):
        cls.amount = 0
        cls.checkouts = []
        cls.transactions = []

    def _default_checkout(self, checkout_reference: uuid.UUID | None = None) -> SumUpCheckout:
        return SumUpCheckout(
            amount=self.amount,
            checkout_reference=checkout_reference or uuid.uuid4(),
            currency="EUR",
            description="",
            id=str(uuid.uuid4()),
            merchant_code=self.merchant_code,
            status=SumUpCheckoutStatus.PAID,
            date=datetime.now(),
        )

    def _default_transaction(self) -> SumUpTransaction:
        return SumUpTransaction(
            id=str(uuid.uuid4()),
            amount=self.amount,
            currency="EUR",
            payment_type="EC",
            product_summary="",
            card_type="EC",
            type="PAYMENT",
            status=SumUpTransactionStatus.SUCCESSFUL,
            timestamp=datetime.now(),
            transaction_code="asdfqweffyfd",
        )

    async def create_sumup_checkout(self, checkout: SumUpCreateCheckout) -> SumUpCheckout:
        created = SumUpCheckout(
            amount=checkout.amount,
            checkout_reference=checkout.checkout_reference,
            currency=checkout.currency,
            description=checkout.description,
            id=str(uuid.uuid4()),
            merchant_code=checkout.merchant_code,
            status=SumUpCheckoutStatus.PENDING,
            date=datetime.now(),
        )
        self.checkouts.append(created)
        return created

    async def list_checkouts(self) -> list[SumUpCheckout]:
        if self.checkouts:
            return self.checkouts
        return [self._default_checkout()]

    async def list_transactions(self) -> list[SumUpTransaction]:
        if self.transactions:
            return self.transactions
        return [self._default_transaction()]

    async def get_checkout(self, checkout_id: str) -> SumUpCheckout | None:
        for checkout in self.checkouts:
            if checkout.id == checkout_id:
                return checkout
        if self.checkouts:
            return None
        return self._default_checkout()

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
