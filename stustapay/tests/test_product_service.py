# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.product import NewProduct
from stustapay.core.service.product import ProductService
from .common import BaseTestCase


class ProductServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.product_service = ProductService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_basic_product_workflow(self):
        product = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Test Product", price=3, tax_name="ust")
        )
        self.assertEqual(product.name, "Test Product")

        with self.assertRaises(PermissionError):
            await self.product_service.create_product(
                token=self.cashier_token, product=NewProduct(name="Test Product", price=3, tax_name="ust")
            )

        updated_product = await self.product_service.update_product(
            token=self.admin_token,
            product_id=product.id,
            product=NewProduct(name="Updated Test Product", price=4, tax_name="eust"),
        )
        self.assertEqual(updated_product.name, "Updated Test Product")
        self.assertEqual(updated_product.price, 4)
        self.assertEqual(updated_product.tax_name, "eust")

        products = await self.product_service.list_products(token=self.admin_token)
        self.assertEqual(len(products), 1)
        self.assertEqual(products[0].name, "Updated Test Product")

        with self.assertRaises(PermissionError):
            await self.product_service.delete_product(token=self.cashier_token, product_id=product.id)

        deleted = await self.product_service.delete_product(token=self.admin_token, product_id=product.id)
        self.assertTrue(deleted)
