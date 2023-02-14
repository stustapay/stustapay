from .common import BaseTestCase
from stustapay.core.service.transaction import TransactionService
from stustapay.core.schema.transaction import NewTransaction, NewLineItem
from stustapay.core.service.product import ProductService
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.user import User, Privilege, UserWithoutId
from ..core.service.user import UserService


class TransactionLogicTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.admin_user = User(id=1, name="test-user", description="", privileges=[Privilege.admin])
        self.user_service = UserService(db_pool=self.db_pool, config=self.test_config)
        self.product_service = ProductService(db_pool=self.db_pool, config=self.test_config)
        self.transaction_service = TransactionService(db_pool=self.db_pool, config=self.test_config)

        self.product = await self.product_service.create_product(
            current_user=self.admin_user, product=NewProduct(name="Test Product", price=3, tax="ust")
        )
        self.cashier = await self.user_service.create_user_no_auth(
            new_user=UserWithoutId(name="test_cashier", description="", privileges=[Privilege.cashier])
        )

    async def test_basic_transaction_flow(self):
        transaction_id = await self.transaction_service.create_transaction(
            current_user=self.cashier,
            transaction=NewTransaction(positions=[NewLineItem(product_id=self.product.id, quantity=2)]),
        )
        transaction = await self.transaction_service.show_transaction(transaction_id=transaction_id.id)
        self.assertEqual(transaction.itemcount, 1)
        self.assertEqual(len(transaction.line_items), 1)
        self.assertEqual(transaction.line_items[0].quantity, 2)
