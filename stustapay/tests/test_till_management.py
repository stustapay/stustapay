# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import secrets

import pytest
from sftkit.error import InvalidArgument

from stustapay.core.schema.ticket import NewTicket
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.terminal import NewTerminal, Terminal, TerminalMode
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import (
    NewCashRegisterStocking,
    NewTill,
    NewTillButton,
    NewTillLayout,
    NewTillProfile,
)
from stustapay.core.schema.tree import NewEvent, NewNode, Node, ROOT_NODE_ID
from sftkit.error import AccessDenied
from stustapay.core.service.product import ProductService
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till.till import TillService
from stustapay.core.service.tree.service import TreeService, create_event
from sftkit.database import Connection

from .conftest import Cashier


async def _create_other_event(db_connection: Connection) -> Node:
    return await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=NewEvent(
            name=f"other-till-event-{secrets.token_hex(8)}",
            description="",
            customer_portal_url=f"http://other-till-event-{secrets.token_hex(8)}.test",
            customer_portal_contact_email="test@test.support.test.com",
            customer_portal_about_page_url="",
            customer_portal_data_privacy_url="",
            currency_identifier="EUR",
            sepa_enabled=False,
            sepa_sender_name="",
            sepa_description="",
            sepa_sender_iban="",
            sepa_allowed_country_codes=[],
            bon_title="",
            bon_issuer="",
            bon_address="",
            max_account_balance=150,
            sumup_topup_enabled=False,
            sumup_payment_enabled=False,
            sumup_affiliate_key="",
            sumup_api_key="",
            sumup_merchant_code="",
            ust_id="",
            email_enabled=False,
            email_default_sender=None,
            email_smtp_host=None,
            email_smtp_port=None,
            email_smtp_username=None,
            email_smtp_password=None,
            payout_done_subject="",
            payout_done_message="",
            payout_registered_subject="",
            payout_registered_message="",
            payout_sender=None,
            pretix_presale_enabled=False,
            pretix_api_key=None,
            pretix_event=None,
            pretix_organizer=None,
            pretix_shop_url=None,
            pretix_ticket_ids=None,
        ),
    )


async def _create_node_local_till_setup(
    *,
    tree_service: TreeService,
    terminal_service: TerminalService,
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
) -> tuple[Node, Terminal, Terminal, int]:
    child_node = await tree_service.create_node(
        token=event_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Till Child Node", description=""),
    )
    first_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=child_node.id,
        terminal=NewTerminal(name="Child Terminal 1", description="", mode=TerminalMode.till),
    )
    second_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=child_node.id,
        terminal=NewTerminal(name="Child Terminal 2", description="", mode=TerminalMode.till),
    )
    layout = await till_service.layout.create_layout(
        token=event_admin_token,
        node_id=child_node.id,
        layout=NewTillLayout(name="child-layout", description="", button_ids=[]),
    )
    profile = await till_service.profile.create_profile(
        token=event_admin_token,
        node_id=child_node.id,
        profile=NewTillProfile(
            name="child-profile",
            description="",
            layout_id=layout.id,
            allow_top_up=True,
            allow_cash_out=True,
            allow_ticket_sale=True,
            allow_ticket_vouchers=False,
            enable_ssp_payment=True,
            enable_cash_payment=True,
            enable_card_payment=False,
        ),
    )
    return child_node, first_terminal, second_terminal, profile.id


async def test_basic_till_register_stocking(till_service: TillService, event_node: Node, event_admin_token: str):
    stocking = await till_service.register.create_cash_register_stockings(
        token=event_admin_token,
        node_id=event_node.id,
        stocking=NewCashRegisterStocking(name="Dummy", euro20=2),
    )
    assert "Dummy" == stocking.name
    assert 40 == stocking.total

    stocking = await till_service.register.update_cash_register_stockings(
        token=event_admin_token,
        node_id=event_node.id,
        stocking_id=stocking.id,
        stocking=NewCashRegisterStocking(name="Dummy", euro20=2, euro5=10),
    )
    assert 90 == stocking.total

    stockings = await till_service.register.list_cash_register_stockings_admin(
        token=event_admin_token, node_id=event_node.id
    )
    assert stocking in stockings

    deleted = await till_service.register.delete_cash_register_stockings(
        token=event_admin_token, node_id=event_node.id, stocking_id=stocking.id
    )
    assert deleted


async def test_basic_till_button_workflow(
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    event_node: Node,
    event_admin_token: str,
    cashier: Cashier,
):
    product1 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="Helles 0,5l", price=3, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    product2 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="Radler 0,5l", price=2.5, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    product_pfand = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="Pfand", price=2.5, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )

    button = await till_service.layout.create_button(
        token=event_admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
    )
    assert button.name == "Helles 0,5l"
    assert button.price == 5.5

    with pytest.raises(AccessDenied):
        await till_service.layout.create_button(
            token=cashier.token,
            node_id=event_node.id,
            button=NewTillButton(name="Helles 0,5l", product_ids=[product1.id, product_pfand.id]),
        )

    updated_button = await till_service.layout.update_button(
        token=event_admin_token,
        node_id=event_node.id,
        button_id=button.id,
        button=NewTillButton(name="Radler 0,5l", product_ids=[product2.id, product_pfand.id]),
    )
    assert updated_button.name == "Radler 0,5l"
    assert updated_button.price == 5

    buttons = await till_service.layout.list_buttons(token=event_admin_token, node_id=event_node.id)
    assert updated_button in buttons

    with pytest.raises(AccessDenied):
        await till_service.layout.delete_button(token=cashier.token, node_id=event_node.id, button_id=updated_button.id)

    deleted = await till_service.layout.delete_button(
        token=event_admin_token, node_id=event_node.id, button_id=updated_button.id
    )
    assert deleted


async def test_till_buttons_reject_foreign_event_products(
    db_connection: Connection,
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    event_node: Node,
    event_admin_token: str,
    global_admin_token: str,
):
    other_event = await _create_other_event(db_connection)
    local_product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="Local Button Product", price=3, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    foreign_product = await product_service.create_product(
        token=global_admin_token,
        node_id=other_event.id,
        product=NewProduct(name="Foreign Button Product", price=3, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )

    with pytest.raises(InvalidArgument):
        await till_service.layout.create_button(
            token=event_admin_token,
            node_id=event_node.id,
            button=NewTillButton(name="Foreign Product Button", product_ids=[foreign_product.id]),
        )

    button = await till_service.layout.create_button(
        token=event_admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Local Product Button", product_ids=[local_product.id]),
    )
    with pytest.raises(InvalidArgument):
        await till_service.layout.update_button(
            token=event_admin_token,
            node_id=event_node.id,
            button_id=button.id,
            button=NewTillButton(name="Invalid Updated Button", product_ids=[foreign_product.id]),
        )

    unchanged = await till_service.layout.get_button(
        token=event_admin_token, node_id=event_node.id, button_id=button.id
    )
    assert unchanged is not None
    assert unchanged.product_ids == [local_product.id]


async def test_till_layouts_reject_foreign_event_buttons_and_tickets(
    db_connection: Connection,
    product_service: ProductService,
    ticket_service: TicketService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    event_node: Node,
    event_admin_token: str,
    global_admin_token: str,
):
    other_event = await _create_other_event(db_connection)
    local_button = await till_service.layout.create_button(
        token=event_admin_token,
        node_id=event_node.id,
        button=NewTillButton(name="Local Layout Button", product_ids=[]),
    )
    foreign_product = await product_service.create_product(
        token=global_admin_token,
        node_id=other_event.id,
        product=NewProduct(name="Foreign Layout Product", price=3, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    foreign_button = await till_service.layout.create_button(
        token=global_admin_token,
        node_id=other_event.id,
        button=NewTillButton(name="Foreign Layout Button", product_ids=[foreign_product.id]),
    )
    foreign_ticket = await ticket_service.create_ticket(
        token=global_admin_token,
        node_id=other_event.id,
        ticket=NewTicket(
            name="Foreign Layout Ticket",
            price=3,
            tax_rate_id=tax_rate_ust.id,
            restrictions=[],
            is_locked=True,
            initial_top_up_amount=0,
        ),
    )

    with pytest.raises(InvalidArgument):
        await till_service.layout.create_layout(
            token=event_admin_token,
            node_id=event_node.id,
            layout=NewTillLayout(name="Foreign Button Layout", description="", button_ids=[foreign_button.id]),
        )
    with pytest.raises(InvalidArgument):
        await till_service.layout.create_layout(
            token=event_admin_token,
            node_id=event_node.id,
            layout=NewTillLayout(name="Foreign Ticket Layout", description="", ticket_ids=[foreign_ticket.id]),
        )

    layout = await till_service.layout.create_layout(
        token=event_admin_token,
        node_id=event_node.id,
        layout=NewTillLayout(name="Local Layout", description="", button_ids=[local_button.id]),
    )
    with pytest.raises(InvalidArgument):
        await till_service.layout.update_layout(
            token=event_admin_token,
            node_id=event_node.id,
            layout_id=layout.id,
            layout=NewTillLayout(name="Invalid Updated Layout", description="", button_ids=[foreign_button.id]),
        )

    unchanged = await till_service.layout.get_layout(
        token=event_admin_token, node_id=event_node.id, layout_id=layout.id
    )
    assert unchanged is not None
    assert unchanged.button_ids == [local_button.id]


async def test_basic_till_workflow(
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
    cashier: Cashier,
):
    button1 = await till_service.layout.create_button(
        token=event_admin_token, node_id=event_node.id, button=NewTillButton(name="Helles 1,0l", product_ids=[])
    )
    button2 = await till_service.layout.create_button(
        token=event_admin_token, node_id=event_node.id, button=NewTillButton(name="Helles 0,5l", product_ids=[])
    )
    till_layout = await till_service.layout.create_layout(
        token=event_admin_token,
        node_id=event_node.id,
        layout=NewTillLayout(name="layout1", description="", button_ids=[button1.id, button2.id]),
    )
    till_profile = await till_service.profile.create_profile(
        token=event_admin_token,
        node_id=event_node.id,
        profile=NewTillProfile(
            name="profile1",
            description="",
            layout_id=till_layout.id,
            allow_top_up=False,
            allow_cash_out=False,
            allow_ticket_sale=False,
            allow_ticket_vouchers=False,
            enable_ssp_payment=True,
            enable_cash_payment=False,
            enable_card_payment=False,
        ),
    )
    till = await till_service.create_till(
        token=event_admin_token,
        node_id=event_node.id,
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
            node_id=event_node.id,
            till=NewTill(
                name="Pot 1",
                description="Pottipot",
                active_shift=None,
                active_profile_id=till_profile.id,
            ),
        )

    updated_till = await till_service.update_till(
        token=event_admin_token,
        node_id=event_node.id,
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

    tills = await till_service.list_tills(token=event_admin_token, node_id=event_node.id)
    assert updated_till in tills

    with pytest.raises(AccessDenied):
        await till_service.delete_till(token=cashier.token, node_id=event_node.id, till_id=till.id)

    deleted = await till_service.delete_till(token=event_admin_token, node_id=event_node.id, till_id=till.id)
    assert deleted


async def test_child_node_till_create_and_update_keep_terminal_assignment_local(
    till_service: TillService,
    terminal_service: TerminalService,
    tree_service: TreeService,
    event_admin_token: str,
    event_node: Node,
):
    child_node, first_terminal, second_terminal, profile_id = await _create_node_local_till_setup(
        tree_service=tree_service,
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
    )

    till = await till_service.create_till(
        token=event_admin_token,
        node_id=child_node.id,
        till=NewTill(name="Child Till", description="", active_profile_id=profile_id, terminal_id=first_terminal.id),
    )
    assert till.node_id == child_node.id
    assert till.terminal_id == first_terminal.id

    updated_till = await till_service.update_till(
        token=event_admin_token,
        node_id=child_node.id,
        till_id=till.id,
        till=NewTill(name="Child Till Updated", description="", active_profile_id=profile_id, terminal_id=second_terminal.id),
    )
    assert updated_till.terminal_id == second_terminal.id


async def test_create_till_rejects_cross_node_terminal_assignment(
    till_service: TillService,
    terminal_service: TerminalService,
    tree_service: TreeService,
    till_profile,
    event_admin_token: str,
    event_node: Node,
):
    child_node, first_terminal, _, _ = await _create_node_local_till_setup(
        tree_service=tree_service,
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
    )

    with pytest.raises(InvalidArgument, match="same node"):
        await till_service.create_till(
            token=event_admin_token,
            node_id=event_node.id,
            till=NewTill(
                name="Cross Node Till",
                description="",
                active_profile_id=till_profile.id,
                terminal_id=first_terminal.id,
            ),
        )


async def test_update_till_rejects_cross_node_terminal_assignment(
    till_service: TillService,
    terminal_service: TerminalService,
    tree_service: TreeService,
    till,
    till_profile,
    event_admin_token: str,
    event_node: Node,
):
    _, first_terminal, _, _ = await _create_node_local_till_setup(
        tree_service=tree_service,
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
    )

    with pytest.raises(InvalidArgument, match="same node"):
        await till_service.update_till(
            token=event_admin_token,
            node_id=event_node.id,
            till_id=till.id,
            till=NewTill(
                name=till.name,
                description=till.description,
                active_shift=till.active_shift,
                active_profile_id=till_profile.id,
                terminal_id=first_terminal.id,
            ),
        )


async def test_switch_terminal_rejects_cross_node_terminal_assignment(
    till_service: TillService,
    terminal_service: TerminalService,
    tree_service: TreeService,
    till,
    event_admin_token: str,
    event_node: Node,
):
    _, first_terminal, _, _ = await _create_node_local_till_setup(
        tree_service=tree_service,
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
    )

    with pytest.raises(InvalidArgument, match="same node"):
        await till_service.switch_terminal(
            token=event_admin_token,
            node_id=event_node.id,
            till_id=till.id,
            new_terminal_id=first_terminal.id,
        )


async def test_switch_till_rejects_cross_node_till_assignment(
    till_service: TillService,
    terminal_service: TerminalService,
    tree_service: TreeService,
    terminal: Terminal,
    event_admin_token: str,
    event_node: Node,
):
    child_node, first_terminal, _, profile_id = await _create_node_local_till_setup(
        tree_service=tree_service,
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
    )
    del first_terminal
    child_till = await till_service.create_till(
        token=event_admin_token,
        node_id=child_node.id,
        till=NewTill(name="Child Till", description="", active_profile_id=profile_id),
    )

    with pytest.raises(InvalidArgument, match="same node"):
        await terminal_service.switch_till(
            token=event_admin_token,
            node_id=event_node.id,
            terminal_id=terminal.id,
            new_till_id=child_till.id,
        )


async def test_remove_from_terminal_clears_legacy_cross_node_assignment(
    db_connection,
    till_service: TillService,
    terminal_service: TerminalService,
    tree_service: TreeService,
    terminal: Terminal,
    event_admin_token: str,
    event_node: Node,
):
    child_node, _, _, profile_id = await _create_node_local_till_setup(
        tree_service=tree_service,
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
    )
    child_till = await till_service.create_till(
        token=event_admin_token,
        node_id=child_node.id,
        till=NewTill(name="Child Till", description="", active_profile_id=profile_id),
    )

    await db_connection.execute("update till set terminal_id = $1 where id = $2", terminal.id, child_till.id)

    await till_service.remove_from_terminal(token=event_admin_token, node_id=event_node.id, till_id=child_till.id)

    detached_till = await till_service.get_till(token=event_admin_token, node_id=event_node.id, till_id=child_till.id)
    assert detached_till is not None
    assert detached_till.terminal_id is None


async def test_button_references_max_one_voucher_product(
    event_node: Node,
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    event_admin_token: str,
):
    product1 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="p1", is_locked=True, price=5, price_in_vouchers=3, tax_rate_id=tax_rate_ust.id),
    )
    product2 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="p2", is_locked=True, price=3, price_in_vouchers=2, tax_rate_id=tax_rate_ust.id),
    )
    button = await till_service.layout.create_button(
        token=event_admin_token, node_id=event_node.id, button=NewTillButton(name="foo", product_ids=[product1.id])
    )
    assert button is not None

    with pytest.raises(Exception):
        await till_service.layout.update_button(
            token=event_admin_token,
            node_id=event_node.id,
            button_id=button.id,
            button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
        )


async def test_button_references_products_without_manual_locking(
    event_node: Node,
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    event_admin_token: str,
):
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="foo", is_locked=False, price=5, tax_rate_id=tax_rate_ust.id),
    )
    button = await till_service.layout.create_button(
        token=event_admin_token, node_id=event_node.id, button=NewTillButton(name="foo", product_ids=[product.id])
    )
    assert button is not None


async def test_button_references_max_one_variable_price_product(
    product_service: ProductService,
    tax_rate_ust: TaxRate,
    event_node: Node,
    till_service: TillService,
    event_admin_token: str,
):
    product1 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="p1", is_locked=True, fixed_price=False, tax_rate_id=tax_rate_ust.id, price=None),
    )
    product2 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="p2", is_locked=True, fixed_price=False, tax_rate_id=tax_rate_ust.id, price=None),
    )
    button = await till_service.layout.create_button(
        token=event_admin_token, node_id=event_node.id, button=NewTillButton(name="foo", product_ids=[product1.id])
    )
    assert button is not None

    with pytest.raises(Exception):
        await till_service.layout.update_button(
            token=event_admin_token,
            node_id=event_node.id,
            button_id=button.id,
            button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
        )


async def test_button_references_max_one_returnable_product(
    product_service: ProductService,
    event_node: Node,
    tax_rate_ust: TaxRate,
    till_service: TillService,
    event_admin_token: str,
):
    product1 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="p1", is_locked=True, price=5, is_returnable=True, tax_rate_id=tax_rate_ust.id),
    )
    product2 = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="p2", is_locked=True, price=3, is_returnable=True, tax_rate_id=tax_rate_ust.id),
    )
    button = await till_service.layout.create_button(
        token=event_admin_token, node_id=event_node.id, button=NewTillButton(name="foo", product_ids=[product1.id])
    )
    assert button is not None

    with pytest.raises(Exception):
        await till_service.layout.update_button(
            token=event_admin_token,
            node_id=event_node.id,
            button_id=button.id,
            button=NewTillButton(name="foo", product_ids=[product1.id, product2.id]),
        )
