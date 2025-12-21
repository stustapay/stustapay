from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import (
    ContextProductService,
    ContextTaxRateService,
    ContextTillService,
    ContextTerminalService,
    ContextTreeService,
)
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
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
    TillProfile,
)
from stustapay.core.schema.tree import EventSummary


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
            name="list_tax_rates",
            description="List tax rates for a node to supply tax_rate_id when creating products.",
            method="GET",
            path="/llm/tax-rates?node_id=<id>",
        ),
        ToolDescription(
            name="list_events",
            description="List accessible events with their node IDs; optionally filter by event name.",
            method="GET",
            path="/llm/events?name_query=<substring>",
        ),
        ToolDescription(
            name="list_till_profiles",
            description="List till profiles for a node to supply active_profile_id when creating tills.",
            method="GET",
            path="/llm/till-profiles?node_id=<id>",
        ),
        ToolDescription(
            name="list_till_buttons",
            description="List till buttons for a node to supply button_ids when creating layouts.",
            method="GET",
            path="/llm/till-buttons?node_id=<id>",
        ),
        ToolDescription(
            name="list_till_layouts",
            description="List till layouts for a node.",
            method="GET",
            path="/llm/till-layouts?node_id=<id>",
        ),
    ]


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


@router.post("/tills", response_model=Till)
async def create_till_llm(
    payload: CreateTillPayload,
    token: CurrentAuthToken,
    till_service: ContextTillService,
):
    return await till_service.create_till(token=token, till=payload.till, node_id=payload.node_id)


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


@router.post("/terminals", response_model=Terminal)
async def create_terminal_llm(
    payload: CreateTerminalPayload,
    token: CurrentAuthToken,
    terminal_service: ContextTerminalService,
):
    return await terminal_service.create_terminal(token=token, terminal=payload.terminal, node_id=payload.node_id)


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
