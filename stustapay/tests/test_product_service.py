# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest

from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.product import ProductService

from .conftest import Cashier


async def test_basic_product_workflow(
    product_service: ProductService, tax_rate_ust: TaxRate, tax_rate_none: TaxRate, admin_token: str, cashier: Cashier
):
    product = await product_service.create_product(
        token=admin_token, product=NewProduct(name="Test Product", price=3, tax_rate_id=tax_rate_ust.id)
    )

    assert product.name == "Test Product"

    with pytest.raises(AccessDenied):
        await product_service.create_product(
            token=cashier.token,
            product=NewProduct(name="Test Product", price=3, tax_rate_id=tax_rate_ust.id),
        )

    updated_product = await product_service.update_product(
        token=admin_token,
        product_id=product.id,
        product=NewProduct(name="Updated Test Product", price=4, tax_rate_id=tax_rate_none.id),
    )
    assert updated_product.name == "Updated Test Product"
    assert updated_product.price == 4
    assert updated_product.tax_name == tax_rate_none.name

    products = await product_service.list_products(token=admin_token)
    assert len(list(filter(lambda p: p.name == "Updated Test Product", products))) == 1

    with pytest.raises(AccessDenied):
        await product_service.delete_product(token=cashier.token, product_id=product.id)

    deleted = await product_service.delete_product(token=admin_token, product_id=product.id)
    assert deleted
