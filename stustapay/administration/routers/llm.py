from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sftkit.error import NotFound

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import (
    ContextProductService,
    ContextTaxRateService,
    ContextTillService,
    ContextTerminalService,
    ContextTreeService,
)
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import NewTaxRate, TaxRate
from stustapay.core.schema.terminal import NewTerminal, Terminal
from stustapay.core.schema.till import (
    CashRegister,
    NewCashRegister,
    NewTill,
    NewTillButton,
    NewTillLayout,
    Till,
    TillButton,
    TillLayout,
    NewTillProfile,
    TillProfile,
)
from stustapay.core.schema.tree import EventSummary, NewNode, Node, NodeSeenByUser


class ToolDescription(BaseModel):
    name: str
    description: str
    method: Literal["GET", "POST"]
    path: str
    input_schema: dict[str, Any] | None = None


class CreateProductPayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the product belongs to.")
    product: NewProduct


class CreateTillPayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the till belongs to.")
    till: NewTill


class CreateCashRegisterPayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the cash register belongs to.")
    cash_register: NewCashRegister


class CreateTillButtonPayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the button belongs to.")
    button: NewTillButton


class CreateTillLayoutPayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the layout belongs to.")
    layout: NewTillLayout


class CreateTerminalPayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the terminal belongs to.")
    terminal: NewTerminal


class CreateNodePayload(BaseModel):
    parent_node_id: int = Field(..., description="ID of the parent node below which the child node will be created.")
    node: NewNode


class CreateTaxRatePayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the tax rate belongs to.")
    tax_rate: NewTaxRate


class CreateTillProfilePayload(BaseModel):
    node_id: int = Field(..., description="ID of the node/event the till profile belongs to.")
    till_profile: NewTillProfile


class NodeQuery(BaseModel):
    node_id: int = Field(..., description="ID of the node/event to list resources for.")


class SubtreeNodeQuery(BaseModel):
    node_id: int = Field(..., description="ID of the node/event to list resources for.")
    include_subtree: bool = Field(
        default=False,
        description="When true, aggregate resources from the node and all visible descendant nodes.",
    )


class EventQuery(BaseModel):
    name_query: str | None = Field(default=None, description="Optional case-insensitive substring filter for event names.")


class NodeChildrenQuery(BaseModel):
    parent_node_id: int = Field(..., description="ID of the parent node whose direct children should be listed.")
    name_query: str | None = Field(default=None, description="Optional case-insensitive substring filter for child node names.")


def _find_node_in_tree(root: NodeSeenByUser, node_id: int) -> NodeSeenByUser | None:
    if root.id == node_id:
        return root
    for child in root.children:
        result = _find_node_in_tree(child, node_id)
        if result is not None:
            return result
    return None


def _filter_nodes_by_name(nodes: list[NodeSeenByUser], name_query: str | None) -> list[NodeSeenByUser]:
    if not name_query:
        return nodes
    lowered_query = name_query.lower()
    return [node for node in nodes if lowered_query in node.name.lower()]


def _flatten_subtree(node: NodeSeenByUser) -> list[NodeSeenByUser]:
    nodes = [node]
    for child in node.children:
        nodes.extend(_flatten_subtree(child))
    return nodes



router = APIRouter(
    prefix="/llm",
    tags=["llm"],
    responses={404: {"description": "Not found"}},
)


@router.get("/tools", response_model=list[ToolDescription])
async def list_llm_tools():
    return [
        ToolDescription(
            name="create_product",
            description="Create a user-defined product for an event node. "
            "Use /llm/tax-rates to discover valid tax_rate_id values.",
            method="POST",
            path="/llm/products",
            input_schema=CreateProductPayload.model_json_schema(),
        ),
        ToolDescription(
            name="create_cash_register",
            description="Create a cash register that can later be assigned to cashiers or tills.",
            method="POST",
            path="/llm/cash-registers",
            input_schema=CreateCashRegisterPayload.model_json_schema(),
        ),
        ToolDescription(
            name="create_till",
            description="Create a till (POS) including the active profile to control available actions.",
            method="POST",
            path="/llm/tills",
            input_schema=CreateTillPayload.model_json_schema(),
        ),
        ToolDescription(
            name="create_till_button",
            description="Create a till button and assign product ids it should trigger.",
            method="POST",
            path="/llm/till-buttons",
            input_schema=CreateTillButtonPayload.model_json_schema(),
        ),
        ToolDescription(
            name="create_till_layout",
            description="Create a till layout that references buttons and optionally tickets.",
            method="POST",
            path="/llm/till-layouts",
            input_schema=CreateTillLayoutPayload.model_json_schema(),
        ),
        ToolDescription(
            name="create_terminal",
            description="Create a terminal device entry (can be linked to a till later).",
            method="POST",
            path="/llm/terminals",
            input_schema=CreateTerminalPayload.model_json_schema(),
        ),
        ToolDescription(
            name="list_nodes",
            description="List direct child nodes below a given parent node. Optionally filter by child node name.",
            method="GET",
            path="/llm/nodes?parent_node_id=<id>&name_query=<substring>",
            input_schema=NodeChildrenQuery.model_json_schema(),
        ),
        ToolDescription(
            name="create_node",
            description="Create a child node below an existing event or subnode.",
            method="POST",
            path="/llm/nodes",
            input_schema=CreateNodePayload.model_json_schema(),
        ),
        ToolDescription(
            name="create_tax_rate",
            description="Create a tax rate for a node so imported products can reference it.",
            method="POST",
            path="/llm/tax-rates",
            input_schema=CreateTaxRatePayload.model_json_schema(),
        ),
        ToolDescription(
            name="list_tax_rates",
            description="List tax rates for a node to supply tax_rate_id when creating products.",
            method="GET",
            path="/llm/tax-rates?node_id=<id>",
            input_schema=NodeQuery.model_json_schema(),
        ),
        ToolDescription(
            name="list_events",
            description="List accessible events with their node IDs; optionally filter by event name.",
            method="GET",
            path="/llm/events?name_query=<substring>",
            input_schema=EventQuery.model_json_schema(),
        ),
        ToolDescription(
            name="list_products",
            description="List existing products for a node. Pass include_subtree=true to aggregate child nodes for event-root imports.",
            method="GET",
            path="/llm/products?node_id=<id>&include_subtree=<bool>",
            input_schema=SubtreeNodeQuery.model_json_schema(),
        ),
        ToolDescription(
            name="list_terminals",
            description="List existing terminals for a node to support duplicate detection and relinking.",
            method="GET",
            path="/llm/terminals?node_id=<id>",
            input_schema=NodeQuery.model_json_schema(),
        ),
        ToolDescription(
            name="list_tills",
            description="List existing tills for a node to support duplicate detection and relinking.",
            method="GET",
            path="/llm/tills?node_id=<id>",
            input_schema=NodeQuery.model_json_schema(),
        ),
        ToolDescription(
            name="list_cash_registers",
            description="List existing cash registers for a node. Pass include_subtree=true to aggregate child nodes for event-root imports.",
            method="GET",
            path="/llm/cash-registers?node_id=<id>&include_subtree=<bool>",
            input_schema=SubtreeNodeQuery.model_json_schema(),
        ),
        ToolDescription(
            name="create_till_profile",
            description="Create a till profile that can be assigned to imported tills.",
            method="POST",
            path="/llm/till-profiles",
            input_schema=CreateTillProfilePayload.model_json_schema(),
        ),
        ToolDescription(
            name="list_till_profiles",
            description="List till profiles for a node to supply active_profile_id when creating tills.",
            method="GET",
            path="/llm/till-profiles?node_id=<id>",
            input_schema=NodeQuery.model_json_schema(),
        ),
        ToolDescription(
            name="list_till_buttons",
            description="List till buttons for a node to supply button_ids when creating layouts.",
            method="GET",
            path="/llm/till-buttons?node_id=<id>",
            input_schema=NodeQuery.model_json_schema(),
        ),
        ToolDescription(
            name="list_till_layouts",
            description="List till layouts for a node.",
            method="GET",
            path="/llm/till-layouts?node_id=<id>",
            input_schema=NodeQuery.model_json_schema(),
        ),
    ]


@router.get("/nodes", response_model=list[NodeSeenByUser])
async def list_nodes_llm(
    token: CurrentAuthToken,
    tree_service: ContextTreeService,
    parent_node_id: int,
    name_query: str | None = None,
):
    tree = await tree_service.get_tree_for_current_user(token=token)
    parent_node = _find_node_in_tree(tree, parent_node_id)
    if parent_node is None:
        raise NotFound(element_type="node", element_id=parent_node_id)
    return _filter_nodes_by_name(parent_node.children, name_query)


@router.post("/nodes", response_model=Node)
async def create_node_llm(
    payload: CreateNodePayload,
    token: CurrentAuthToken,
    tree_service: ContextTreeService,
):
    return await tree_service.create_node(token=token, new_node=payload.node, node_id=payload.parent_node_id)


@router.post("/products", response_model=Product)
async def create_product_llm(
    payload: CreateProductPayload,
    token: CurrentAuthToken,
    product_service: ContextProductService,
):
    return await product_service.create_product(
        token=token, product=payload.product, node_id=payload.node_id
    )


@router.post("/cash-registers", response_model=CashRegister)
async def create_cash_register_llm(
    payload: CreateCashRegisterPayload,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.register.create_cash_register(
        token=token, new_register=payload.cash_register, node_id=payload.node_id
    )


@router.get("/cash-registers", response_model=list[CashRegister])
async def list_cash_registers_llm(
    token: CurrentAuthToken,
    till_service: ContextTillService,
    tree_service: ContextTreeService,
    node_id: int,
    include_subtree: bool = False,
):
    if not include_subtree:
        return await till_service.register.list_cash_registers_admin(token=token, node_id=node_id)

    tree = await tree_service.get_tree_for_current_user(token=token)
    root_node = _find_node_in_tree(tree, node_id)
    if root_node is None:
        raise NotFound(element_type="node", element_id=node_id)

    registers_by_id: dict[int, CashRegister] = {}
    for subtree_node in _flatten_subtree(root_node):
        for register in await till_service.register.list_cash_registers_admin(token=token, node_id=subtree_node.id):
            registers_by_id[register.id] = register
    return sorted(registers_by_id.values(), key=lambda register: register.name)


@router.post("/tills", response_model=Till)
async def create_till_llm(
    payload: CreateTillPayload,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.create_till(token=token, till=payload.till, node_id=payload.node_id)


@router.get("/tills", response_model=list[Till])
async def list_tills_llm(token: CurrentAuthToken, till_service: ContextTillService, node_id: int):
    return await till_service.list_tills(token=token, node_id=node_id)


@router.post("/till-buttons", response_model=TillButton)
async def create_till_button_llm(
    payload: CreateTillButtonPayload,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.layout.create_button(token=token, button=payload.button, node_id=payload.node_id)


@router.post("/till-layouts", response_model=TillLayout)
async def create_till_layout_llm(
    payload: CreateTillLayoutPayload,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.layout.create_layout(token=token, layout=payload.layout, node_id=payload.node_id)


@router.post("/till-profiles", response_model=TillProfile)
async def create_till_profile_llm(
    payload: CreateTillProfilePayload,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.profile.create_profile(
        token=token, profile=payload.till_profile, node_id=payload.node_id
    )


@router.post("/terminals", response_model=Terminal)
async def create_terminal_llm(
    payload: CreateTerminalPayload,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
):
    return await terminal_service.create_terminal(token=token, terminal=payload.terminal, node_id=payload.node_id)


@router.get("/terminals", response_model=list[Terminal])
async def list_terminals_llm(token: CurrentAuthToken, terminal_service: ContextTerminalService, node_id: int):
    return await terminal_service.list_terminals(token=token, node_id=node_id)


@router.get("/products", response_model=list[Product])
async def list_products_llm(
    token: CurrentAuthToken,
    product_service: ContextProductService,
    tree_service: ContextTreeService,
    node_id: int,
    include_subtree: bool = False,
):
    if not include_subtree:
        return await product_service.list_products(token=token, node_id=node_id)

    tree = await tree_service.get_tree_for_current_user(token=token)
    root_node = _find_node_in_tree(tree, node_id)
    if root_node is None:
        raise NotFound(element_type="node", element_id=node_id)

    products_by_id: dict[int, Product] = {}
    for subtree_node in _flatten_subtree(root_node):
        for product in await product_service.list_products(token=token, node_id=subtree_node.id):
            products_by_id[product.id] = product
    return sorted(products_by_id.values(), key=lambda product: product.name)


@router.post("/tax-rates", response_model=TaxRate)
async def create_tax_rate_llm(
    payload: CreateTaxRatePayload,
    token: CurrentAuthToken,
    tax_service: ContextTaxRateService,
):
    return await tax_service.create_tax_rate(token=token, tax_rate=payload.tax_rate, node_id=payload.node_id)


@router.get("/tax-rates", response_model=list[TaxRate])
async def list_tax_rates_llm(token: CurrentAuthToken, tax_service: ContextTaxRateService, node_id: int):
    return await tax_service.list_tax_rates(token=token, node_id=node_id)


@router.get("/events", response_model=list[EventSummary])
async def list_events_llm(
    token: CurrentAuthToken, tree_service: ContextTreeService, name_query: str | None = None
):
    return await tree_service.search_events(token=token, name_query=name_query)


@router.get("/till-profiles", response_model=list[TillProfile])
async def list_till_profiles_llm(token: CurrentAuthToken, till_service: ContextTillService, node_id: int):
    return await till_service.profile.list_profiles(token=token, node_id=node_id)


@router.get("/till-buttons", response_model=list[TillButton])
async def list_till_buttons_llm(token: CurrentAuthToken, till_service: ContextTillService, node_id: int):
    return await till_service.layout.list_buttons(token=token, node_id=node_id)


@router.get("/till-layouts", response_model=list[TillLayout])
async def list_till_layouts_llm(token: CurrentAuthToken, till_service: ContextTillService, node_id: int):
    return await till_service.layout.list_layouts(token=token, node_id=node_id)
