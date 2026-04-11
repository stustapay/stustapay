import pytest
from sftkit.error import AccessDenied

from stustapay.administration.routers.llm import (
    CreateNodePayload,
    CreateTaxRatePayload,
    CreateTillProfilePayload,
    create_node_llm,
    create_tax_rate_llm,
    create_till_profile_llm,
    list_cash_registers_llm,
    list_llm_tools,
    list_nodes_llm,
    list_products_llm,
    list_terminals_llm,
    list_tills_llm,
)
from stustapay.core.schema.product import NewProduct
from stustapay.core.schema.tax_rate import NewTaxRate
from stustapay.core.schema.till import NewCashRegister, NewTillProfile
from stustapay.core.schema.tree import NewNode, Node


async def test_list_llm_tools_includes_import_helpers():
    tools = await list_llm_tools()
    tools_by_name = {tool.name: tool for tool in tools}

    expected_tools = {
        "list_nodes": ("/llm/nodes?parent_node_id=<id>&name_query=<substring>", "GET"),
        "create_node": ("/llm/nodes", "POST"),
        "create_tax_rate": ("/llm/tax-rates", "POST"),
        "create_till_profile": ("/llm/till-profiles", "POST"),
        "list_products": ("/llm/products?node_id=<id>&include_subtree=<bool>", "GET"),
        "list_terminals": ("/llm/terminals?node_id=<id>", "GET"),
        "list_tills": ("/llm/tills?node_id=<id>", "GET"),
        "list_cash_registers": ("/llm/cash-registers?node_id=<id>&include_subtree=<bool>", "GET"),
    }

    for tool_name, (path, method) in expected_tools.items():
        assert tool_name in tools_by_name
        tool = tools_by_name[tool_name]
        assert tool.path == path
        assert tool.method == method
        assert tool.input_schema is not None


async def test_create_and_list_nodes_llm(
    tree_service,
    event_admin_token: str,
    event_node: Node,
):
    child = await create_node_llm(
        payload=CreateNodePayload(
            parent_node_id=event_node.id,
            node=NewNode(name="Ausschank", description="Bar area"),
        ),
        token=event_admin_token,
        tree_service=tree_service,
    )
    second_child = await create_node_llm(
        payload=CreateNodePayload(
            parent_node_id=event_node.id,
            node=NewNode(name="Kasse", description="Cash desk"),
        ),
        token=event_admin_token,
        tree_service=tree_service,
    )
    await create_node_llm(
        payload=CreateNodePayload(
            parent_node_id=child.id,
            node=NewNode(name="Unterbereich", description="Nested area"),
        ),
        token=event_admin_token,
        tree_service=tree_service,
    )

    direct_children = await list_nodes_llm(
        token=event_admin_token,
        tree_service=tree_service,
        parent_node_id=event_node.id,
    )
    assert {node.id for node in direct_children} == {child.id, second_child.id}

    filtered_children = await list_nodes_llm(
        token=event_admin_token,
        tree_service=tree_service,
        parent_node_id=event_node.id,
        name_query="kass",
    )
    assert [node.id for node in filtered_children] == [second_child.id]


async def test_create_node_llm_enforces_existing_permissions(
    tree_service,
    cashier,
    event_node: Node,
):
    with pytest.raises(AccessDenied):
        await create_node_llm(
            payload=CreateNodePayload(
                parent_node_id=event_node.id,
                node=NewNode(name="Forbidden", description="No admin rights"),
            ),
            token=cashier.token,
            tree_service=tree_service,
        )


async def test_create_tax_rate_and_till_profile_llm(
    tax_rate_service,
    till_service,
    event_admin_token: str,
    event_node: Node,
    till_layout,
):
    tax_rate = await create_tax_rate_llm(
        payload=CreateTaxRatePayload(
            node_id=event_node.id,
            tax_rate=NewTaxRate(name="import-ust", rate=0.07, description="Reduced VAT"),
        ),
        token=event_admin_token,
        tax_service=tax_rate_service,
    )
    assert tax_rate.name == "import-ust"
    assert tax_rate.rate == 0.07

    till_profile = await create_till_profile_llm(
        payload=CreateTillProfilePayload(
            node_id=event_node.id,
            till_profile=NewTillProfile(
                name="import-profile",
                description="Imported profile",
                layout_id=till_layout.id,
                allow_top_up=True,
                allow_cash_out=False,
                allow_ticket_sale=False,
                allow_ticket_vouchers=False,
                enable_ssp_payment=True,
                enable_cash_payment=True,
                enable_card_payment=False,
            ),
        ),
        token=event_admin_token,
        till_service=till_service,
    )
    assert till_profile.name == "import-profile"
    assert till_profile.layout_id == till_layout.id


async def test_llm_list_endpoints_match_existing_services_for_direct_node_scope(
    tree_service,
    product_service,
    terminal_service,
    till_service,
    tax_rate_ust,
    event_admin_token: str,
    event_node: Node,
    till,
):
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(name="Imported Product", price=5.5, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    cash_register = await till_service.register.create_cash_register(
        token=event_admin_token,
        node_id=event_node.id,
        new_register=NewCashRegister(name="Import Register"),
    )

    llm_products = await list_products_llm(
        token=event_admin_token,
        product_service=product_service,
        tree_service=tree_service,
        node_id=event_node.id,
    )
    service_products = await product_service.list_products(token=event_admin_token, node_id=event_node.id)
    assert {item.id for item in llm_products} == {item.id for item in service_products}
    assert product.id in {item.id for item in llm_products}

    llm_terminals = await list_terminals_llm(
        token=event_admin_token,
        terminal_service=terminal_service,
        node_id=event_node.id,
    )
    service_terminals = await terminal_service.list_terminals(token=event_admin_token, node_id=event_node.id)
    assert {item.id for item in llm_terminals} == {item.id for item in service_terminals}
    assert till.terminal_id in {item.id for item in llm_terminals}

    llm_tills = await list_tills_llm(
        token=event_admin_token,
        till_service=till_service,
        node_id=event_node.id,
    )
    service_tills = await till_service.list_tills(token=event_admin_token, node_id=event_node.id)
    assert {item.id for item in llm_tills} == {item.id for item in service_tills}
    assert till.id in {item.id for item in llm_tills}

    llm_cash_registers = await list_cash_registers_llm(
        token=event_admin_token,
        till_service=till_service,
        tree_service=tree_service,
        node_id=event_node.id,
    )
    service_cash_registers = await till_service.register.list_cash_registers_admin(
        token=event_admin_token,
        node_id=event_node.id,
    )
    assert {item.id for item in llm_cash_registers} == {item.id for item in service_cash_registers}
    assert cash_register.id in {item.id for item in llm_cash_registers}


async def test_llm_list_endpoints_can_include_subtree_for_event_root(
    tree_service,
    product_service,
    till_service,
    tax_rate_ust,
    event_admin_token: str,
    event_node: Node,
):
    child_node = await create_node_llm(
        payload=CreateNodePayload(
            parent_node_id=event_node.id,
            node=NewNode(name="Subtree Child", description="Child node for subtree listing"),
        ),
        token=event_admin_token,
        tree_service=tree_service,
    )
    product = await product_service.create_product(
        token=event_admin_token,
        node_id=child_node.id,
        product=NewProduct(name="Child Product", price=7.5, tax_rate_id=tax_rate_ust.id, is_locked=True),
    )
    cash_register = await till_service.register.create_cash_register(
        token=event_admin_token,
        node_id=child_node.id,
        new_register=NewCashRegister(name="Child Register"),
    )

    llm_products = await list_products_llm(
        token=event_admin_token,
        product_service=product_service,
        tree_service=tree_service,
        node_id=event_node.id,
        include_subtree=True,
    )
    assert product.id in {item.id for item in llm_products}

    llm_cash_registers = await list_cash_registers_llm(
        token=event_admin_token,
        till_service=till_service,
        tree_service=tree_service,
        node_id=event_node.id,
        include_subtree=True,
    )
    assert cash_register.id in {item.id for item in llm_cash_registers}
