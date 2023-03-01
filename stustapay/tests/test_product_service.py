# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.user import User, Privilege
from .common import BaseTestCase
from stustapay.core.schema.product import NewProduct
from stustapay.core.service.product import ProductService


class ProductServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.admin_user = User(id=1, name="test-user", description="", privileges=[Privilege.admin])
        self.orga_user = User(id=1, name="test-user", description="", privileges=[Privilege.orga])

        self.product_service = ProductService(db_pool=self.db_pool, config=self.test_config)

    async def test_basic_product_workflow(self):
        product = await self.product_service.create_product(
            current_user=self.admin_user, product=NewProduct(name="Test Product", price=3, tax="ust")
        )
        self.assertEqual(product.name, "Test Product")

        with self.assertRaises(PermissionError):
            await self.product_service.create_product(
                current_user=self.orga_user, product=NewProduct(name="Test Product", price=3, tax="ust")
            )

        updated_product = await self.product_service.update_product(
            current_user=self.admin_user,
            product_id=product.id,
            product=NewProduct(name="Updated Test Product", price=4, tax="eust"),
        )
        self.assertEqual(updated_product.name, "Updated Test Product")
        self.assertEqual(updated_product.price, 4)
        self.assertEqual(updated_product.tax, "eust")

        products = await self.product_service.list_products(current_user=self.admin_user)
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0].name, "Updated Test Product")

        with self.assertRaises(PermissionError):
            await self.product_service.delete_product(current_user=self.orga_user, product_id=product.id)

        deleted = await self.product_service.delete_product(current_user=self.admin_user, product_id=product.id)
        self.assertTrue(deleted)
