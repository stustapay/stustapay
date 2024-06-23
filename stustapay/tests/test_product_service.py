# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest
from asyncpg import RaiseError
from sftkit.database import Connection

from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.tree import NewNode, Node
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.product import ProductService

from ..core.service.tree.service import create_node
from .conftest import Cashier


async def test_basic_product_workflow(
    product_service: ProductService,
    event_node: Node,
    tax_rate_ust: TaxRate,
    tax_rate_none: TaxRate,
    event_admin_token: str,
    cashier: Cashier,
):
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="Test Product", price=3, tax_rate_id=tax_rate_ust.id),
    )

    assert product.name == "Test Product"

    with pytest.raises(AccessDenied):
        await product_service.create_product(
            token=cashier.token,
            node_id=event_node.id,
            product=NewProduct(name="Test Product", price=3, tax_rate_id=tax_rate_ust.id),
        )

    updated_product = await product_service.update_product(
        token=event_admin_token,
        product_id=product.id,
        node_id=event_node.id,
        product=NewProduct(name="Updated Test Product", price=4, tax_rate_id=tax_rate_none.id),
    )
    assert updated_product.name == "Updated Test Product"
    assert updated_product.price == 4
    assert updated_product.tax_name == tax_rate_none.name

    products = await product_service.list_products(token=event_admin_token, node_id=event_node.id)
    assert len(list(filter(lambda p: p.name == "Updated Test Product", products))) == 1

    with pytest.raises(AccessDenied):
        await product_service.delete_product(token=cashier.token, node_id=event_node.id, product_id=product.id)

    deleted = await product_service.delete_product(
        token=event_admin_token, node_id=event_node.id, product_id=product.id
    )
    assert deleted


async def test_product_name_is_unique_in_tree(
    product_service: ProductService,
    db_connection: Connection,
    event_node: Node,
    tax_rate_none: TaxRate,
    event_admin_token: str,
):
    sub_node = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(
            name="sub node", description="", forbidden_objects_at_node=[], forbidden_objects_in_subtree=[]
        ),
    )
    sub_sub_node = await create_node(
        conn=db_connection,
        parent_id=sub_node.id,
        new_node=NewNode(
            name="sub sub node", description="", forbidden_objects_at_node=[], forbidden_objects_in_subtree=[]
        ),
    )
    product = NewProduct(name="Test Product", price=3, tax_rate_id=tax_rate_none.id)
    await product_service.create_product(
        token=event_admin_token,
        node_id=sub_node.id,
        product=product,
    )

    with pytest.raises(RaiseError):
        # will not allow a duplicate name on the same node
        await product_service.create_product(
            token=event_admin_token,
            node_id=sub_node.id,
            product=product,
        )
    with pytest.raises(RaiseError):
        # will not allow a duplicate name in a sub node
        await product_service.create_product(
            token=event_admin_token,
            node_id=event_node.id,
            product=product,
        )
    with pytest.raises(RaiseError):
        # will not allow a duplicate name in a parent node
        await product_service.create_product(
            token=event_admin_token,
            node_id=sub_sub_node.id,
            product=product,
        )
