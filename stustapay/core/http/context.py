"""
context injection for the http-api with FastAPI.
"""

from dataclasses import dataclass
from typing import Annotated, Optional

from fastapi import Depends, Request

from stustapay.core.config import Config
from stustapay.core.service.account import AccountService
from stustapay.core.service.cashier import CashierService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.mail import MailService
from stustapay.core.service.order import OrderService
from stustapay.core.service.presale.presale import PresaleService
from stustapay.core.service.product import ProductService
from stustapay.core.service.sumup import SumUpService
from stustapay.core.service.tax_rate import TaxRateService
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.ticket import TicketService
from stustapay.core.service.till import TillService
from stustapay.core.service.tree.service import TreeService
from stustapay.core.service.tse import TseService
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import UserTagService


@dataclass
class Context:
    """
    provides access to data injected by the ContextMiddleware
    into each request.
    """

    config: Config
    order_service: Optional[OrderService] = None
    product_service: Optional[ProductService] = None
    tax_rate_service: Optional[TaxRateService] = None
    user_service: Optional[UserService] = None
    customer_service: Optional[CustomerService] = None
    till_service: Optional[TillService] = None
    config_service: Optional[ConfigService] = None
    account_service: Optional[AccountService] = None
    cashier_service: Optional[CashierService] = None
    ticket_service: Optional[TicketService] = None
    user_tag_service: Optional[UserTagService] = None
    tse_service: Optional[TseService] = None
    tree_service: Optional[TreeService] = None
    sumup_service: Optional[SumUpService] = None
    terminal_service: Optional[TerminalService] = None
    mail_service: Optional[MailService] = None
    presale_service: Optional[PresaleService] = None


def get_context(request: Request):
    return request.state.context


def get_order_service(request: Request) -> OrderService:
    return request.state.context.order_service


def get_product_service(request: Request) -> ProductService:
    return request.state.context.product_service


def get_tax_rate_service(request: Request) -> TaxRateService:
    return request.state.context.tax_rate_service


def get_user_service(request: Request) -> UserService:
    return request.state.context.user_service


def get_customer_service(request: Request) -> CustomerService:
    return request.state.context.customer_service

def get_presale_service(request: Request) -> PresaleService:
    return request.state.context.presale_service

def get_till_service(request: Request) -> TillService:
    return request.state.context.till_service


def get_config_service(request: Request) -> ConfigService:
    return request.state.context.config_service


def get_account_service(request: Request) -> AccountService:
    return request.state.context.account_service


def get_cashier_service(request: Request) -> CashierService:
    return request.state.context.cashier_service


def get_ticket_service(request: Request) -> TicketService:
    return request.state.context.ticket_service


def get_user_tag_service(request: Request) -> UserService:
    return request.state.context.user_tag_service


def get_tse_service(request: Request) -> TseService:
    return request.state.context.tse_service


def get_tree_service(request: Request) -> TreeService:
    return request.state.context.tree_service


def get_sumup_service(request: Request) -> SumUpService:
    return request.state.context.sumup_service


def get_terminal_service(request: Request) -> TerminalService:
    return request.state.context.terminal_service


def get_mail_service(request: Request) -> MailService:
    return request.state.context.mail_service


ContextOrderService = Annotated[OrderService, Depends(get_order_service)]
ContextProductService = Annotated[ProductService, Depends(get_product_service)]
ContextTaxRateService = Annotated[TaxRateService, Depends(get_tax_rate_service)]
ContextUserService = Annotated[UserService, Depends(get_user_service)]
ContextCustomerService = Annotated[CustomerService, Depends(get_customer_service)]
ContextPresaleService = Annotated[PresaleService, Depends(get_presale_service)]
ContextTillService = Annotated[TillService, Depends(get_till_service)]
ContextConfigService = Annotated[ConfigService, Depends(get_config_service)]
ContextAccountService = Annotated[AccountService, Depends(get_account_service)]
ContextUserTagService = Annotated[UserTagService, Depends(get_user_tag_service)]
ContextCashierService = Annotated[CashierService, Depends(get_cashier_service)]
ContextTicketService = Annotated[TicketService, Depends(get_ticket_service)]
ContextTseService = Annotated[TseService, Depends(get_tse_service)]
ContextTreeService = Annotated[TreeService, Depends(get_tree_service)]
ContextSumUpService = Annotated[SumUpService, Depends(get_sumup_service)]
ContextTerminalService = Annotated[TerminalService, Depends(get_terminal_service)]
ContextMailService = Annotated[MailService, Depends(get_mail_service)]
