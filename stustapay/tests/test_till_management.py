# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import pytest

from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import (
    NewCashRegisterStocking,
    NewTill,
    NewTillButton,
    NewTillLayout,
    NewTillProfile,
)
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.product import ProductService
from stustapay.core.service.till import TillService

from .conftest import Cashier


async def test_basic_till_register_stocking(till_service: TillService, admin_token: str):
    stocking = await till_service.register.create_cash_register_stockings(
        token=admin_token,
        stocking=NewCashRegisterStocking(name="Dummy", euro20=2),
    )
    assert "Dummy" == stocking.name
    assert 40 == stocking.total

    stocking = await till_service.register.update_cash_register_stockings(
        token=admin_token,
        stocking_id=stocking.id,
        stocking=NewCashRegisterStocking(name="Dummy", euro20=2, euro5=10),
    )
    assert 90 == stocking.total

    stockings = await till_service.register.list_cash_register_stockings_admin(token=admin_token)
    assert stocking in stockings

    deleted = await till_service.register.delete_cash_register_stockings(token=admin_token, stocking_id=stocking.id)
    assert deleted


async def test_basic_till_button_workflow(
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    admin_token: str,
    cashier: Cashier,
):
    product1 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="Helles 0,5l", price=3, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    product2 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="Radler 0,5l", price=2.5, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    product_pfand = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="Pfand", price=2.5, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )

    button = await till_service.layout.create_button(
        token=admin_token,
        button=NewTillButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
    )
    assert button.name == "Helles 0,5l"
    assert button.price == 5.5

    with pytest.raises(AccessDenied):
        await till_service.layout.create_button(
            token=cashier.token,
            button=NewTillButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
        )

    updated_button = await till_service.layout.update_button(
        token=admin_token,
        button_id=button.id,
        button=NewTillButton(name="Radler 0,5l", product_ids=[product2.id, product_pfand.id]),
    )
    assert updated_button.name == "Radler 0,5l"
    assert updated_button.price == 5

    buttons = await till_service.layout.list_buttons(token=admin_token)
    assert updated_button in buttons

    with pytest.raises(AccessDenied):
        await till_service.layout.delete_button(token=cashier.token, button_id=updated_button.id)

    deleted = await till_service.layout.delete_button(token=admin_token, button_id=updated_button.id)
    assert deleted


async def test_basic_till_workflow(
    till_service: TillService,
    admin_token: str,
    cashier: Cashier,
):
    button1 = await till_service.layout.create_button(
        token=admin_token, button=NewTillButton(name="Helles 1,0l", product_ids=[])
    )
    button2 = await till_service.layout.create_button(
        token=admin_token, button=NewTillButton(name="Helles 0,5l", product_ids=[])
    )
    till_layout = await till_service.layout.create_layout(
        token=admin_token,
        layout=NewTillLayout(name="layout1", description="", button_ids=[button1.id, button2.id]),
    )
    till_profile = await till_service.profile.create_profile(
        token=admin_token,
        profile=NewTillProfile(
            name="profile1",
            description="",
            layout_id=till_layout.id,
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=False,
        ),
    )
    till = await till_service.create_till(
        token=admin_token,
        till=NewTill(
            name="Pot 1",
            description="Pottipot",
            active_shift=None,
            active_profile_id=till_profile.id,
        ),
    )
    assert till.name == "Pot 1"

    with pytest.raises(AccessDenied):
        await till_service.create_till(
            token=cashier.token,
            till=NewTill(
                name="Pot 1",
                description="Pottipot",
                active_shift=None,
                active_profile_id=till_profile.id,
            ),
        )

    updated_till = await till_service.update_till(
        token=admin_token,
        till_id=till.id,
        till=NewTill(
            name="Pot 2",
            description="Pottipot - new",
            active_shift=None,
            active_profile_id=till_profile.id,
        ),
    )
    assert updated_till.name == "Pot 2"
    assert updated_till.description == "Pottipot - new"

    tills = await till_service.list_tills(token=admin_token)
    assert updated_till in tills

    with pytest.raises(AccessDenied):
        await till_service.delete_till(token=cashier.token, till_id=till.id)

    deleted = await till_service.delete_till(token=admin_token, till_id=till.id)
    assert deleted


async def test_button_references_max_one_voucher_product(
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    admin_token: str,
):
    product1 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="p1", is_locked=True, price=5, price_in_vouchers=3, tax_rate_id=tax_rate_ust.id),
    )
    product2 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="p2", is_locked=True, price=3, price_in_vouchers=2, tax_rate_id=tax_rate_ust.id),
    )
    button = await till_service.layout.create_button(
        token=admin_token, button=NewTillButton(name="foo", product_ids=[product1.id])
    )
    assert button is not None

    with pytest.raises(Exception):
        await till_service.layout.update_button(
            token=admin_token,
            button_id=button.id,
            button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
        )


async def test_button_references_locked_products(
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    admin_token: str,
):
    product = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="foo", is_locked=False, price=5, tax_rate_id=tax_rate_ust.id),
    )
    with pytest.raises(Exception):
        await till_service.layout.create_button(
            token=admin_token, button=NewTillButton(name="foo", product_ids=[product.id])
        )

    product = await product_service.update_product(
        token=admin_token,
        product_id=product.id,
        product=NewProduct(name="foo", is_locked=True, price=5, tax_rate_id=tax_rate_ust.id),
    )
    button = await till_service.layout.create_button(
        token=admin_token, button=NewTillButton(name="foo", product_ids=[product.id])
    )
    assert button is not None


async def test_button_references_max_one_variable_price_product(
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    admin_token: str,
):
    product1 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="p1", is_locked=True, fixed_price=False, tax_rate_id=tax_rate_ust.id, price=None),
    )
    product2 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="p2", is_locked=True, fixed_price=False, tax_rate_id=tax_rate_ust.id, price=None),
    )
    button = await till_service.layout.create_button(
        token=admin_token, button=NewTillButton(name="foo", product_ids=[product1.id])
    )
    assert button is not None

    with pytest.raises(Exception):
        await till_service.layout.update_button(
            token=admin_token,
            button_id=button.id,
            button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
        )


async def test_button_references_max_one_returnable_product(
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    admin_token: str,
):
    product1 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="p1", is_locked=True, price=5, is_returnable=True, tax_rate_id=tax_rate_ust.id),
    )
    product2 = await product_service.create_product(
        token=admin_token,
        product=NewProduct(name="p2", is_locked=True, price=3, is_returnable=True, tax_rate_id=tax_rate_ust.id),
    )
    button = await till_service.layout.create_button(
        token=admin_token, button=NewTillButton(name="foo", product_ids=[product1.id])
    )
    assert button is not None

    with pytest.raises(Exception):
        await till_service.layout.update_button(
            token=admin_token,
            button_id=button.id,
            button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
        )
