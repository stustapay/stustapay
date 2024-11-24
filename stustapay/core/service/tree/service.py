import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.bon.bon import BonJson, generate_dummy_bon_json
from stustapay.bon.revenue_report import generate_dummy_report, generate_report
from stustapay.core.config import Config
from stustapay.core.schema.tree import (
    NewEvent,
    NewNode,
    Node,
    NodeSeenByUser,
    ObjectType,
    RestrictedEventSettings,
)
from stustapay.core.schema.user import CurrentUser, Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.common.error import InvalidArgument, NotFound
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
    get_tree_for_current_user,
)
from stustapay.payment.sumup.api import fetch_refresh_token_from_auth_code


async def _check_if_object_exists(conn: Connection, node: Node, object_type: ObjectType, in_subtree: bool):
    if in_subtree:
        query_string = "select exists(select from {} t join node n on t.node_id = n.id where $1 = any(n.parent_ids))"
    else:
        query_string = "select exists(select from {} t where t.node_id = $1)"

    if object_type == ObjectType.terminal:
        return await conn.fetchval(query_string.format("terminal"), node.id)
    if object_type == ObjectType.till:
        if await conn.fetchval(query_string.format("till"), node.id):
            return True
        if await conn.fetchval(query_string.format("till_layout"), node.id):
            return True
        if await conn.fetchval(query_string.format("till_button"), node.id):
            return True
        if await conn.fetchval(query_string.format("till_profile"), node.id):
            return True
        return False
    if object_type == ObjectType.product:
        return await conn.fetchval(query_string.format("product"), node.id)
    if object_type == ObjectType.ticket:
        return await conn.fetchval(query_string.format("ticket"), node.id)
    if object_type == ObjectType.tse:
        return await conn.fetchval(query_string.format("tse"), node.id)
    if object_type == ObjectType.user:
        return await conn.fetchval(query_string.format("usr"), node.id)
    if object_type == ObjectType.user_role:
        return await conn.fetchval(query_string.format("user_role"), node.id)
    if object_type == ObjectType.tax_rate:
        return await conn.fetchval(query_string.format("tax_rate"), node.id)
    if object_type == ObjectType.account:
        return await conn.fetchval(query_string.format("account"), node.id)
    if object_type == ObjectType.user_tag:
        return await conn.fetchval(query_string.format("user_tag"), node.id)

    return False


async def _update_forbidden_objects_in_subtree(conn: Connection, node: Node, forbidden: set[ObjectType]):
    current = set(node.forbidden_objects_in_subtree)

    to_add = forbidden.difference(current)
    to_remove = current.difference(forbidden)

    for t in to_remove:
        await conn.execute(
            "delete from forbidden_objects_in_subtree_at_node where node_id = $1 and object_name = $2", node.id, t.name
        )

    for t in to_add:
        object_exists = await _check_if_object_exists(conn=conn, node=node, object_type=t, in_subtree=True)
        if object_exists:
            raise InvalidArgument(f"Cannot forbid {t.name} at this node as objects already exist")
        await conn.execute(
            "insert into forbidden_objects_in_subtree_at_node (object_name, node_id) values ($1, $2)", t.value, node.id
        )


async def _update_forbidden_objects_at_node(conn: Connection, node: Node, forbidden: set[ObjectType]):
    current = set(node.forbidden_objects_at_node)

    to_add = forbidden.difference(current)
    to_remove = current.difference(forbidden)

    for t in to_remove:
        await conn.execute(
            "delete from forbidden_objects_at_node where node_id = $1 and object_name = $2", node.id, t.name
        )

    for t in to_add:
        object_exists = await _check_if_object_exists(conn=conn, node=node, object_type=t, in_subtree=False)
        if object_exists:
            raise InvalidArgument(f"Cannot forbid {t.name} at this node as objects already exist")
        await conn.execute(
            "insert into forbidden_objects_at_node (object_name, node_id) values ($1, $2)", t.value, node.id
        )


async def create_node(conn: Connection, parent_id: int, new_node: NewNode, event_id: int | None = None) -> Node:
    new_node_id = await conn.fetchval(
        "insert into node (parent, name, description, event_id) values ($1, $2, $3, $4) returning id",
        parent_id,
        new_node.name,
        new_node.description,
        event_id,
    )
    result = await fetch_node(conn=conn, node_id=new_node_id)
    assert result is not None
    await _update_forbidden_objects_at_node(conn=conn, node=result, forbidden=set(new_node.forbidden_objects_at_node))
    await _update_forbidden_objects_in_subtree(
        conn=conn, node=result, forbidden=set(new_node.forbidden_objects_in_subtree)
    )
    result = await fetch_node(conn=conn, node_id=new_node_id)
    assert result is not None
    return result


async def _create_system_accounts(conn: Connection, node_id: int):
    await conn.execute(
        "insert into account (type, name, comment, node_id) values "
        "   ('cash_entry', 'Cash Entry', 'source account when cash enters the system', $1), "
        "   ('cash_exit', 'Cash Exit', 'target account when cash exits the system', $1), "
        "   ('sale_exit', 'Sale Exit', 'target account when sales are made', $1), "
        "   ('sumup_entry', 'Sumup Entry', 'source account when money enters the system via sumup', $1), "
        "   ('sumup_online_entry', 'Sumup Online Entry', 'source account when money enters the system via sumup online payment', $1), "
        "   ('cash_imbalance', 'Cash Imbalanace', 'used to correct cash imbalances, e.g. when closing out cash-handling tills ', $1), "
        "   ('cash_vault', 'Cash Vault', 'represents the cash vault of an event', $1), "
        "   ('cash_topup_source', 'Cash Top Up Source', 'account used when altering customer balances based on cash payments / payouts', $1), "
        "   ('voucher_create', 'Voucher Create', 'Source / Target account for voucher creations / deletions', $1), "
        "   ('donation_exit', 'Donation Exit', 'target account when donation exits the system', $1), "
        "   ('sepa_exit', 'SEPA Exit', 'target account when a SEPA transfer exits the system', $1)",
        node_id,
    )


async def _create_system_tax_rates(conn: Connection, node_id: int):
    await conn.execute(
        "insert into tax_rate (name, rate, description, node_id) values ('none', 0, 'No Tax', $1)",
        node_id,
    )


async def _create_system_tills(conn: Connection, node_id: int):
    virtual_till_layout_id = await conn.fetchval(
        "insert into till_layout (name, description, node_id) values ('Virtual Till layout', '', $1) returning id",
        node_id,
    )
    virtual_till_profile_id = await conn.fetchval(
        "insert into till_profile (name, description, layout_id, node_id) "
        "values ('Virtual Till layout', '', $1, $2) returning id",
        virtual_till_layout_id,
        node_id,
    )
    await conn.execute(
        "insert into till (name, description, active_profile_id, node_id, is_virtual) "
        "values ('Virtual Till', '', $1, $2, true)",
        virtual_till_profile_id,
        node_id,
    )


async def _create_system_products(conn: Connection, node_id: int):
    tax_rate_none_id = await conn.fetchval("select id from tax_rate where node_id = $1", node_id)
    await conn.execute(
        "insert into product (type, name, price, fixed_price, is_locked, tax_rate_id, node_id) values "
        "('discount', 'Rabatt', null, false, true, $1, $2), "
        "('topup', 'Aufladen', null, false, true, $1, $2), "
        "('payout', 'Auszahlen', null, false, true, $1, $2), "
        "('money_transfer', 'Geldtransit', null, false, true, $1, $2),"
        "('imbalance', 'DifferenzSollIst', null, false, true, $1, $2)",
        tax_rate_none_id,
        node_id,
    )


async def _sync_optional_event_metadata(conn: Connection, event_id: int, event: NewEvent):
    for lang_code, translation in event.translation_texts.items():
        for text_type, content in translation.items():
            await conn.execute(
                "insert into translation_text (event_id, lang_code, type, content) values ($1, $2, $3, $4)",
                event_id,
                lang_code.value,
                text_type,
                content,
            )
    if event.payout_done_subject is not None:
        await conn.execute(
            "update event set payout_done_subject = $1 where id = $2", event.payout_done_subject, event_id
        )
    if event.payout_done_message is not None:
        await conn.execute(
            "update event set payout_done_message = $1 where id = $2", event.payout_done_message, event_id
        )
    if event.payout_registered_subject is not None:
        await conn.execute(
            "update event set payout_registered_subject = $1 where id = $2", event.payout_registered_subject, event_id
        )
    if event.payout_registered_message is not None:
        await conn.execute(
            "update event set payout_registered_message = $1 where id = $2", event.payout_registered_subject, event_id
        )


async def create_event(conn: Connection, parent_id: int, event: NewEvent) -> Node:
    # TODO: tree, create all needed resources, e.g. global accounts which have to and should
    #  only exist at an event node
    event_id = await conn.fetchval(
        "insert into event (currency_identifier, sumup_topup_enabled, max_account_balance, ust_id, bon_issuer, "
        "bon_address, bon_title, customer_portal_contact_email, sepa_enabled, sepa_sender_name, sepa_sender_iban, "
        "sepa_description, sepa_allowed_country_codes, customer_portal_url, customer_portal_about_page_url, "
        "customer_portal_data_privacy_url, sumup_payment_enabled, sumup_api_key, sumup_affiliate_key, "
        "sumup_merchant_code, start_date, end_date, daily_end_time, email_enabled, email_default_sender, "
        "email_smtp_host, email_smtp_port, email_smtp_username, email_smtp_password, payout_sender, "
        " sumup_oauth_client_id, sumup_oauth_client_secret) "
        "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, "
        " $25, $26, $27, $28, $29, $30, $31, $32)"
        "returning id",
        event.currency_identifier,
        event.sumup_topup_enabled,
        event.max_account_balance,
        event.ust_id,
        event.bon_issuer,
        event.bon_address,
        event.bon_title,
        event.customer_portal_contact_email,
        event.sepa_enabled,
        event.sepa_sender_name,
        event.sepa_sender_iban,
        event.sepa_description,
        event.sepa_allowed_country_codes,
        event.customer_portal_url,
        event.customer_portal_about_page_url,
        event.customer_portal_data_privacy_url,
        event.sumup_payment_enabled,
        event.sumup_api_key,
        event.sumup_affiliate_key,
        event.sumup_merchant_code,
        event.start_date,
        event.end_date,
        event.daily_end_time,
        event.email_enabled,
        event.email_default_sender,
        event.email_smtp_host,
        event.email_smtp_port,
        event.email_smtp_username,
        event.email_smtp_password,
        event.payout_sender,
        event.sumup_oauth_client_id,
        event.sumup_oauth_client_secret,
    )
    await _sync_optional_event_metadata(conn, event_id, event)

    node = await create_node(conn=conn, parent_id=parent_id, new_node=event, event_id=event_id)
    await _create_system_accounts(conn=conn, node_id=node.id)
    await _create_system_tax_rates(conn=conn, node_id=node.id)
    await _create_system_products(conn=conn, node_id=node.id)
    await _create_system_tills(conn=conn, node_id=node.id)
    return node


class TreeService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node()
    @requires_user(privileges=[Privilege.node_administration])
    async def create_node(self, conn: Connection, node: Node, new_node: NewNode) -> Node:
        return await create_node(conn=conn, parent_id=node.id, new_node=new_node)

    @with_db_transaction
    @requires_node()
    @requires_user(privileges=[Privilege.node_administration])
    async def update_node(self, conn: Connection, node: Node, updated_node: NewNode) -> Node:
        await conn.execute(
            "update node set name = $2, description = $3 where id = $1",
            node.id,
            updated_node.name,
            updated_node.description,
        )
        await _update_forbidden_objects_at_node(
            conn=conn, node=node, forbidden=set(updated_node.forbidden_objects_at_node)
        )
        await _update_forbidden_objects_in_subtree(
            conn=conn, node=node, forbidden=set(updated_node.forbidden_objects_in_subtree)
        )
        result = await fetch_node(conn=conn, node_id=node.id)
        assert result is not None
        return result

    @with_db_transaction
    @requires_node()
    @requires_user(privileges=[Privilege.node_administration])
    async def create_event(self, conn: Connection, node: Node, event: NewEvent) -> Node:
        return await create_event(conn=conn, parent_id=node.id, event=event)

    @with_db_transaction
    @requires_node()
    @requires_user(privileges=[Privilege.node_administration])
    async def update_event(self, conn: Connection, node: Node, event: NewEvent) -> Node:
        event_id = await conn.fetchval("select event_id from node where id = $1", node.id)
        if event_id is None:
            raise NotFound(element_type="event", element_id=node.id)

        await conn.fetchval(
            "update event set currency_identifier = $2, sumup_topup_enabled = $3, max_account_balance = $4, "
            "   customer_portal_contact_email = $5, ust_id = $6, bon_issuer = $7, bon_address = $8, bon_title = $9, "
            "   sepa_enabled = $10, sepa_sender_name = $11, sepa_sender_iban = $12, sepa_description = $13, "
            "   sepa_allowed_country_codes = $14, customer_portal_url = $15, customer_portal_about_page_url = $16,"
            "   customer_portal_data_privacy_url = $17, sumup_payment_enabled = $18, sumup_api_key = $19, "
            "   sumup_affiliate_key = $20, sumup_merchant_code = $21, start_date = $22, end_date = $23, "
            "   daily_end_time = $24, email_enabled = $25, email_default_sender = $26, email_smtp_host = $27, "
            "   email_smtp_port = $28, email_smtp_username = $29, email_smtp_password = $30, "
            "   payout_sender = $31, sumup_oauth_client_id = $32, sumup_oauth_client_secret = $33 "
            "where id = $1",
            event_id,
            event.currency_identifier,
            event.sumup_topup_enabled,
            event.max_account_balance,
            event.customer_portal_contact_email,
            event.ust_id,
            event.bon_issuer,
            event.bon_address,
            event.bon_title,
            event.sepa_enabled,
            event.sepa_sender_name,
            event.sepa_sender_iban,
            event.sepa_description,
            event.sepa_allowed_country_codes,
            event.customer_portal_url,
            event.customer_portal_about_page_url,
            event.customer_portal_data_privacy_url,
            event.sumup_payment_enabled,
            event.sumup_api_key,
            event.sumup_affiliate_key,
            event.sumup_merchant_code,
            event.start_date,
            event.end_date,
            event.daily_end_time,
            event.email_enabled,
            event.email_default_sender,
            event.email_smtp_host,
            event.email_smtp_port,
            event.email_smtp_username,
            event.email_smtp_password,
            event.payout_sender,
            event.sumup_oauth_client_id,
            event.sumup_oauth_client_secret,
        )
        await conn.execute("delete from translation_text where event_id = $1", event_id)
        await _sync_optional_event_metadata(conn, event_id, event)
        updated_node = await fetch_node(conn=conn, node_id=node.id)
        assert updated_node is not None
        return updated_node

    @with_db_transaction(read_only=True)
    @requires_user(node_required=False)
    async def get_tree_for_current_user(self, *, conn: Connection, current_user: CurrentUser) -> NodeSeenByUser:
        return await get_tree_for_current_user(conn=conn, current_user=current_user)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user(privileges=[Privilege.node_administration])
    async def get_restricted_event_settings(self, *, conn: Connection, node: Node) -> RestrictedEventSettings:
        return await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user(privileges=[Privilege.node_administration])
    async def generate_test_bon(self, *, conn: Connection, node: Node) -> BonJson:
        if node.event_node_id is None:
            raise InvalidArgument("Cannot generate bon for a node not associated with an event")
        event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        return await generate_dummy_bon_json(node_id=node.event_node_id, event=event)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user(privileges=[Privilege.node_administration])
    async def generate_test_report(self, *, conn: Connection, node: Node) -> tuple[str, bytes]:
        if node.event_node_id is None:
            raise InvalidArgument("Cannot generate test report for a node not associated with an event")
        event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        dummy_report = await generate_dummy_report(node_id=node.event_node_id, event=event)
        if not dummy_report.success or dummy_report.bon is None:
            print("failed repot", dummy_report.msg)
            raise InvalidArgument(f"Error while generating dummy report: {dummy_report.msg}")
        return dummy_report.bon.mime_type, dummy_report.bon.content

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user(privileges=[Privilege.node_administration])
    async def generate_revenue_report(self, *, conn: Connection, node: Node) -> tuple[str, bytes]:
        if node.event_node_id is None:
            raise InvalidArgument("Cannot generate test report for a node not associated with an event")
        report = await generate_report(conn=conn, node_id=node.id)
        if not report.success or report.bon is None:
            raise InvalidArgument(f"Error while generating report: {report.msg}")
        return report.bon.mime_type, report.bon.content

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user(privileges=[Privilege.node_administration])
    async def archive_node(self, *, conn: Connection, node: Node):
        if node.read_only:
            raise InvalidArgument("Node is already read only")

        await conn.execute("update node set read_only = true where id = $1 or $1 = any(parent_ids)", node.id)

    @with_db_transaction
    @requires_node()
    @requires_user(privileges=[Privilege.node_administration])
    async def delete_node(self, *, conn: Connection, node: Node):
        await conn.execute("delete from node where id = $1", node.id)

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user(privileges=[Privilege.node_administration])
    async def sumup_auth_code_flow(self, *, conn: Connection, node: Node, authorization_code: str):
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)

        token = await fetch_refresh_token_from_auth_code(
            client_id=event_settings.sumup_oauth_client_id,
            client_secret=event_settings.sumup_oauth_client_secret,
            authorization_code=authorization_code,
        )
        assert node.event is not None
        await conn.execute(
            "update event set sumup_oauth_refresh_token = $1 where id = $2", token.refresh_token, node.event.id
        )
