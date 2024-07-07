from fastapi import APIRouter, HTTPException, Response, status

from stustapay.core.http.auth_user import CurrentAuthToken
from stustapay.core.http.context import ContextTicketService
from stustapay.core.schema.ticket import NewTicket, Ticket

router = APIRouter(
    prefix="/tickets",
    tags=["tickets"],
    responses={404: {"description": "Not found"}},
)


@router.get("", response_model=list[Ticket])
async def list_tickets(token: CurrentAuthToken, response: Response, ticket_service: ContextTicketService, node_id: int):
    resp = await ticket_service.list_tickets(token=token, node_id=node_id)
    response.headers["Content-Range"] = str(len(resp))
    return resp


@router.post("", response_model=Ticket)
async def create_ticket(ticket: NewTicket, token: CurrentAuthToken, ticket_service: ContextTicketService, node_id: int):
    return await ticket_service.create_ticket(token=token, ticket=ticket, node_id=node_id)


@router.get("/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: int, token: CurrentAuthToken, ticket_service: ContextTicketService, node_id: int):
    ticket = await ticket_service.get_ticket(token=token, ticket_id=ticket_id, node_id=node_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return ticket


@router.put("/{ticket_id}", response_model=Ticket)
async def update_ticket(
    ticket_id: int,
    ticket: NewTicket,
    token: CurrentAuthToken,
    ticket_service: ContextTicketService,
    node_id: int,
):
    ticket = await ticket_service.update_ticket(token=token, ticket_id=ticket_id, ticket=ticket, node_id=node_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return ticket


@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: int, token: CurrentAuthToken, ticket_service: ContextTicketService, node_id: int):
    deleted = await ticket_service.delete_ticket(token=token, ticket_id=ticket_id, node_id=node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
