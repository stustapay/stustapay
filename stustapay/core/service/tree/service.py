import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.bon.bon import BonJson, generate_dummy_bon_json
from stustapay.bon.revenue_report import generate_dummy_report, generate_report
from stustapay.core.banner_image import http_response_for_stored_banner, validate_and_prepare_banner_upload
from stustapay.core.config import Config
from stustapay.core.schema.tree import (
    CopyEventOptions,
    CopyEventRequest,
    EventSummary,
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
from sftkit.error import InvalidArgument, NotFound
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
    if object_type == ObjectType.entry_area:
        return await conn.fetchval(query_string.format("entry_area"), node.id)
    if object_type == ObjectType.entry_group:
        return await conn.fetchval(query_string.format("entry_group"), node.id)

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
            "update event set payout_registered_message = $1 where id = $2", event.payout_registered_message, event_id
        )


async def create_event(conn: Connection, parent_id: int, event: NewEvent) -> Node:
    # TODO: tree, create all needed resources, e.g. global accounts which have to and should
    #  only exist at an event node
    event_id = await conn.fetchval(
        "insert into event (currency_identifier, sumup_topup_enabled, max_account_balance, vip_max_account_balance, ust_id, bon_issuer, "
        "bon_address, bon_title, customer_portal_contact_email, sepa_enabled, sepa_sender_name, sepa_sender_iban, "
        "sepa_description, sepa_allowed_country_codes, customer_portal_url, customer_portal_about_page_url, "
        "customer_portal_data_privacy_url, sumup_payment_enabled, sumup_api_key, sumup_affiliate_key, "
        "sumup_merchant_code, start_date, end_date, daily_end_time, email_enabled, email_default_sender, "
        "email_smtp_host, email_smtp_port, email_smtp_username, email_smtp_password, payout_sender, "
        "sumup_oauth_client_id, sumup_oauth_client_secret,pretix_presale_enabled, pretix_shop_url, pretix_api_key, "
        "pretix_organizer, pretix_event, pretix_ticket_ids, post_payment_allowed, donation_enabled) "
        "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, "
        "$25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41)"
        "returning id",
        event.currency_identifier,
        event.sumup_topup_enabled,
        event.max_account_balance,
        event.vip_max_account_balance,
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
        event.pretix_presale_enabled,
        event.pretix_shop_url,
        event.pretix_api_key,
        event.pretix_organizer,
        event.pretix_event,
        event.pretix_ticket_ids,
        event.post_payment_allowed,
        event.donation_enabled,
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
            "   vip_max_account_balance = $5, ust_id = $6, bon_issuer = $7, bon_address = $8, bon_title = $9, "
            "   customer_portal_contact_email = $10, sepa_enabled = $11, sepa_sender_name = $12, sepa_sender_iban = $13, "
            "   sepa_description = $14, sepa_allowed_country_codes = $15, customer_portal_url = $16, "
            "   customer_portal_about_page_url = $17, customer_portal_data_privacy_url = $18, sumup_payment_enabled = $19, "
            "   sumup_api_key = $20, sumup_affiliate_key = $21, sumup_merchant_code = $22, start_date = $23, "
            "   end_date = $24, daily_end_time = $25, email_enabled = $26, email_default_sender = $27, "
            "   email_smtp_host = $28, email_smtp_port = $29, email_smtp_username = $30, email_smtp_password = $31, "
            "   payout_sender = $32, sumup_oauth_client_id = $33, sumup_oauth_client_secret = $34, "
            "   pretix_presale_enabled = $35, pretix_shop_url = $36, pretix_api_key = $37, pretix_organizer = $38, "
            "   pretix_event = $39, pretix_ticket_ids = $40, post_payment_allowed = $41, donation_enabled = $42, "
            "   customer_portal_primary_color = $43, customer_portal_secondary_color = $44, "
            "   customer_portal_background_color = $45 "
            "where id = $1",
            event_id,
            event.currency_identifier,
            event.sumup_topup_enabled,
            event.max_account_balance,
            event.vip_max_account_balance,
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
            event.pretix_presale_enabled,
            event.pretix_shop_url,
            event.pretix_api_key,
            event.pretix_organizer,
            event.pretix_event,
            event.pretix_ticket_ids,
            event.post_payment_allowed,
            event.donation_enabled,
            event.customer_portal_primary_color,
            event.customer_portal_secondary_color,
            event.customer_portal_background_color,
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
    @requires_user(node_required=False)
    async def search_events(
        self, *, conn: Connection, current_user: CurrentUser, name_query: str | None = None
    ) -> list[EventSummary]:
        params = [current_user.id]
        query = (
            "select n.id as node_id, n.name as node_name, n.path, n.description, "
            "n.event_id as event_id, n.name as event_name, e.start_date, e.end_date "
            "from node n "
            "join event e on e.id = n.event_id "
            "join user_privileges_at_node($1) u on n.id = u.node_id "
        )
        if name_query:
            query += "where n.name ilike $2 "
            params.append(f"%{name_query}%")
        query += "order by e.start_date desc nulls last, n.name"
        return await conn.fetch_many(EventSummary, query, *params)

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

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user(privileges=[Privilege.node_administration])
    async def upload_event_banner(self, *, conn: Connection, node: Node, image_data: bytes):
        """Upload a banner image for an event."""
        assert node.event is not None
        image_data, mime_type = validate_and_prepare_banner_upload(image_data)
        await conn.execute(
            "update event set banner_image = $1, banner_image_mime_type = $2 where id = $3",
            image_data,
            mime_type,
            node.event.id,
        )

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user(privileges=[Privilege.node_administration])
    async def delete_event_banner(self, *, conn: Connection, node: Node):
        """Delete the banner image for an event."""
        assert node.event is not None
        await conn.execute(
            "update event set banner_image = null, banner_image_mime_type = null where id = $1",
            node.event.id,
        )

    @with_db_transaction(read_only=True)
    async def get_event_banner(self, *, conn: Connection, node_id: int) -> dict | None:
        """Retrieve banner image data for an event node."""
        result = await conn.fetchrow(
            "select e.banner_image, e.banner_image_mime_type "
            "from event e join node n on n.event_id = e.id "
            "where n.id = $1 and e.banner_image is not null",
            node_id
        )
        if result is None:
            return None
        payload = http_response_for_stored_banner(result["banner_image"])
        assert payload is not None
        return payload


    async def _copy_user_tags(self, conn: Connection, source_node_id: int, target_node_id: int):
        """Copy user tags from source node to target node."""
        # Get all user tags from source node
        user_tags = await conn.fetch(
            "SELECT id, uid, pin, restriction, comment, secret_id FROM user_tag WHERE node_id = $1",
            source_node_id
        )

        # Create a mapping from old user tag IDs to new user tag IDs
        user_tag_mapping = {}

        for tag in user_tags:
            # Insert user tag
            new_tag_id = await conn.fetchval(
                "INSERT INTO user_tag (uid, pin, restriction, comment, secret_id, node_id) "
                "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
                tag['uid'], tag['pin'], tag['restriction'], tag['comment'], tag['secret_id'], target_node_id
            )
            user_tag_mapping[tag['id']] = new_tag_id

        return user_tag_mapping

    async def _copy_account_balances(self, conn: Connection, source_node_id: int, target_node_id: int, user_tag_mapping: dict[int, int] | None = None):
        """Copy account balances from source node to target node."""
        # Get all accounts from source node
        accounts = await conn.fetch(
            "SELECT id, user_tag_id, type, name, comment, balance, vouchers FROM account "
            "WHERE node_id = $1",
            source_node_id
        )

        # Create a mapping from old account IDs to new account IDs
        account_id_mapping = {}

        for account in accounts:
            # Map the user_tag_id to the new one if we have a mapping
            new_user_tag_id = None
            if account['user_tag_id'] is not None and user_tag_mapping:
                new_user_tag_id = user_tag_mapping.get(account['user_tag_id'])

            # Insert account with zero balance (as requested - no transactions)
            new_account_id = await conn.fetchval(
                "INSERT INTO account (user_tag_id, type, name, comment, balance, vouchers, node_id) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                new_user_tag_id, account['type'], account['name'], account['comment'],
                account['balance'] if account['balance'] > 0 else 0,  # Only copy positive balances
                account['vouchers'] if account['vouchers'] > 0 else 0,  # Only copy positive vouchers
                target_node_id
            )
            account_id_mapping[account['id']] = new_account_id

        return account_id_mapping

    async def _generate_unique_name(self, conn: Connection, table_name: str, name_column: str, original_name: str, scope_id: int, exclude_names: set[str] | None = None) -> str:
        """Generate a unique name for the given table and scope by appending a suffix if needed."""
        exclude_names = exclude_names or set()

        # For the node table, scope is by parent, not node_id
        if table_name == "node":
            scope_column = "parent"
        elif table_name == "tax_rate":
            # Tax rates appear to have global uniqueness despite per-node architecture
            scope_column = None  # Check globally
        elif table_name == "product":
            # Products should be unique per-node - skip if already used to prevent duplicates
            if original_name in (exclude_names or set()):
                # Skip this duplicate
                return None
            return original_name
        elif table_name == "terminal":
            # Terminals should be unique per-node
            scope_column = "node_id"
        elif table_name == "tse":
            # TSE devices appear to have global uniqueness
            scope_column = None  # Check globally
        else:
            scope_column = "node_id"

        # Check if the original name already exists or is in the exclude list
        if scope_column is None:
            # Global check for tax_rate
            exists = await conn.fetchval(
                f"SELECT EXISTS(SELECT 1 FROM {table_name} WHERE {name_column} = $1)",
                original_name
            )
        else:
            # Scoped check
            exists = await conn.fetchval(
                f"SELECT EXISTS(SELECT 1 FROM {table_name} WHERE {name_column} = $1 AND {scope_column} = $2)",
                original_name, scope_id
            )

        if not exists and original_name not in exclude_names:
            return original_name

        # If it exists, try adding " (Copy)" suffix
        copy_name = f"{original_name} (Copy)"
        if scope_column is None:
            exists = await conn.fetchval(
                f"SELECT EXISTS(SELECT 1 FROM {table_name} WHERE {name_column} = $1)",
                copy_name
            )
        else:
            exists = await conn.fetchval(
                f"SELECT EXISTS(SELECT 1 FROM {table_name} WHERE {name_column} = $1 AND {scope_column} = $2)",
                copy_name, scope_id
            )

        if not exists and copy_name not in exclude_names:
            return copy_name

        # If that also exists, add a number suffix
        counter = 2
        while True:
            numbered_name = f"{original_name} (Copy {counter})"
            if scope_column is None:
                exists = await conn.fetchval(
                    f"SELECT EXISTS(SELECT 1 FROM {table_name} WHERE {name_column} = $1)",
                    numbered_name
                )
            else:
                exists = await conn.fetchval(
                    f"SELECT EXISTS(SELECT 1 FROM {table_name} WHERE {name_column} = $1 AND {scope_column} = $2)",
                    numbered_name, scope_id
                )
            if not exists and numbered_name not in exclude_names:
                return numbered_name
            counter += 1

    async def _copy_tills(self, conn: Connection, source_node_id: int, target_node_id: int):
        """Copy till layouts, profiles, buttons, and registers from source node to target node."""
        # First, get all profiles referenced by tills in the source node
        referenced_profile_ids = await conn.fetch(
            "SELECT DISTINCT active_profile_id FROM till WHERE node_id = $1 AND active_profile_id IS NOT NULL", source_node_id
        )
        referenced_profile_ids_set = set(row['active_profile_id'] for row in referenced_profile_ids)

        # Get all layouts referenced by the referenced profiles
        if referenced_profile_ids_set:
            referenced_layout_ids = await conn.fetch(
                "SELECT DISTINCT layout_id FROM till_profile WHERE id = ANY($1) AND layout_id IS NOT NULL", list(referenced_profile_ids_set)
            )
            referenced_layout_ids_set = set(row['layout_id'] for row in referenced_layout_ids)
        else:
            referenced_layout_ids_set = set()

        # Copy referenced layouts (if they don't already exist in target)
        layout_mapping = {}
        used_layout_names = set()
        for layout_id in referenced_layout_ids_set:
            # Get the layout details
            layout = await conn.fetchrow(
                "SELECT id, name, description, node_id FROM till_layout WHERE id = $1", layout_id
            )
            if layout:
                # Check if this layout already exists in target node
                existing = await conn.fetchval(
                    "SELECT id FROM till_layout WHERE node_id = $1 AND name = $2", target_node_id, layout['name']
                )
                if existing:
                    layout_mapping[layout['id']] = existing
                else:
                    unique_name = await self._generate_unique_name(conn, "till_layout", "name", layout['name'], target_node_id, used_layout_names)
                    used_layout_names.add(unique_name)
                    new_layout_id = await conn.fetchval(
                        "INSERT INTO till_layout (name, description, node_id) VALUES ($1, $2, $3) RETURNING id",
                        unique_name, layout['description'], target_node_id
                    )
                    layout_mapping[layout['id']] = new_layout_id

        # Copy referenced profiles (if they don't already exist in target)
        profile_mapping = {}
        used_profile_names = set()
        for profile_id in referenced_profile_ids_set:
            # Get the profile details
            profile = await conn.fetchrow(
                "SELECT id, name, description, allow_top_up, allow_cash_out, allow_ticket_sale, layout_id, node_id FROM till_profile WHERE id = $1", profile_id
            )
            if profile:
                new_layout_id = layout_mapping.get(profile['layout_id'])
                if new_layout_id is not None:
                    # Check if this profile already exists in target node
                    existing = await conn.fetchval(
                        "SELECT id FROM till_profile WHERE node_id = $1 AND name = $2", target_node_id, profile['name']
                    )
                    if existing:
                        profile_mapping[profile['id']] = existing
                    else:
                        unique_name = await self._generate_unique_name(conn, "till_profile", "name", profile['name'], target_node_id, used_profile_names)
                        used_profile_names.add(unique_name)
                        new_profile_id = await conn.fetchval(
                            "INSERT INTO till_profile (name, description, allow_top_up, allow_cash_out, allow_ticket_sale, layout_id, node_id) "
                            "VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                            unique_name, profile['description'], profile['allow_top_up'], profile['allow_cash_out'],
                            profile['allow_ticket_sale'], new_layout_id, target_node_id
                        )
                        profile_mapping[profile['id']] = new_profile_id

        # Copy till buttons from the source node
        buttons = await conn.fetch("SELECT id, name FROM till_button WHERE node_id = $1", source_node_id)
        button_mapping = {}
        used_button_names = set()
        for button in buttons:
            unique_name = await self._generate_unique_name(conn, "till_button", "name", button['name'], target_node_id, used_button_names)
            used_button_names.add(unique_name)
            new_button_id = await conn.fetchval(
                "INSERT INTO till_button (name, node_id) VALUES ($1, $2) RETURNING id",
                unique_name, target_node_id
            )
            button_mapping[button['id']] = new_button_id

        # Copy till button to product associations
        for old_button_id, new_button_id in button_mapping.items():
            products = await conn.fetch(
                "SELECT product_id FROM till_button_product WHERE button_id = $1", old_button_id
            )
            for product in products:
                await conn.execute(
                    "INSERT INTO till_button_product (button_id, product_id) VALUES ($1, $2)",
                    new_button_id, product['product_id']
                )

        # Copy till layout to button associations for copied layouts
        for old_layout_id, new_layout_id in layout_mapping.items():
            buttons_in_layout = await conn.fetch(
                "SELECT button_id, sequence_number FROM till_layout_to_button WHERE layout_id = $1", old_layout_id
            )
            for button_assoc in buttons_in_layout:
                if button_assoc['button_id'] in button_mapping:
                    await conn.execute(
                        "INSERT INTO till_layout_to_button (layout_id, button_id, sequence_number) "
                        "VALUES ($1, $2, $3)",
                        new_layout_id, button_mapping[button_assoc['button_id']], button_assoc['sequence_number']
                    )

        # Copy actual till entities (excluding virtual tills)
        tills = await conn.fetch(
            "SELECT id, name, description, active_profile_id, terminal_id, is_virtual FROM till WHERE node_id = $1 AND is_virtual = false", source_node_id
        )
        for till in tills:
            new_profile_id = profile_mapping.get(till['active_profile_id'])
            if new_profile_id is not None:
                unique_till_name = await self._generate_unique_name(conn, "till", "name", till['name'], target_node_id)
                await conn.execute(
                    "INSERT INTO till (name, description, active_profile_id, node_id, is_virtual) "
                    "VALUES ($1, $2, $3, $4, false)",
                    unique_till_name, till['description'], new_profile_id, target_node_id
                )

        return profile_mapping

    async def _copy_sub_nodes(self, conn: Connection, source_node_id: int, target_node_id: int, copy_options: CopyEventOptions) -> None:
        """Recursively copy sub-nodes and their contents."""
        # Get all direct children of the source node
        child_nodes = await conn.fetch(
            "SELECT id, name, description FROM node WHERE parent = $1 AND event_id IS NULL",
            source_node_id
        )

        for child_node in child_nodes:
            # Create the child node in the target
            unique_name = await self._generate_unique_name(conn, "node", "name", child_node['name'], target_node_id)
            new_node = await create_node(conn=conn, parent_id=target_node_id, new_node=NewNode(name=unique_name, description=child_node['description']), event_id=None)

            # Recursively copy this node's contents and children
            await self._copy_node_contents(conn, child_node['id'], new_node.id, copy_options)
            await self._copy_sub_nodes(conn, child_node['id'], new_node.id, copy_options)

    async def _copy_node_contents(self, conn: Connection, source_node_id: int, target_node_id: int, copy_options: CopyEventOptions) -> None:
        """Copy the contents of a node (excluding sub-nodes)."""
        # Copy components based on options
        if copy_options.copy_user_tags:
            await self._copy_user_tags(conn, source_node_id, target_node_id)

        if copy_options.copy_account_balances:
            await self._copy_account_balances(conn, source_node_id, target_node_id)

        if copy_options.copy_tills:
            await self._copy_tills(conn, source_node_id, target_node_id)

        if copy_options.copy_terminals:
            await self._copy_terminals(conn, source_node_id, target_node_id)

        if copy_options.copy_users:
            await self._copy_users_and_roles(conn, source_node_id, target_node_id)

        if copy_options.copy_products:
            await self._copy_products_and_tax_rates(conn, source_node_id, target_node_id)

        if copy_options.copy_tse_devices:
            await self._copy_tse_devices(conn, source_node_id, target_node_id)

    async def _copy_terminals(self, conn: Connection, source_node_id: int, target_node_id: int):
        """Copy terminals from source node to target node."""
        terminals = await conn.fetch(
            "SELECT id, name, description FROM terminal WHERE node_id = $1", source_node_id
        )
        used_terminal_names = set()
        for terminal in terminals:
            unique_name = await self._generate_unique_name(conn, "terminal", "name", terminal['name'], target_node_id, used_terminal_names)
            used_terminal_names.add(unique_name)
            await conn.execute(
                "INSERT INTO terminal (name, description, node_id) VALUES ($1, $2, $3)",
                unique_name, terminal['description'], target_node_id
            )

    async def _copy_users_and_roles(self, conn: Connection, source_node_id: int, target_node_id: int, user_tag_mapping: dict[int, int] | None = None, account_id_mapping: dict[int, int] | None = None):
        """Copy user roles and users from source node to target node."""
        # Copy all user roles from the source node
        roles = await conn.fetch(
            "SELECT id, name, is_privileged FROM user_role WHERE node_id = $1", source_node_id
        )
        role_mapping = {}
        used_role_names = set()
        for role in roles:
            unique_name = await self._generate_unique_name(conn, "user_role", "name", role['name'], target_node_id, used_role_names)
            used_role_names.add(unique_name)
            new_role_id = await conn.fetchval(
                "INSERT INTO user_role (name, is_privileged, node_id) VALUES ($1, $2, $3) RETURNING id",
                unique_name, role['is_privileged'], target_node_id
            )
            role_mapping[role['id']] = new_role_id

            # Copy role privileges
            privileges = await conn.fetch(
                "SELECT privilege FROM user_role_to_privilege WHERE role_id = $1", role['id']
            )
            for privilege in privileges:
                await conn.execute(
                    "INSERT INTO user_role_to_privilege (role_id, privilege) VALUES ($1, $2)",
                    new_role_id, privilege['privilege']
                )

        # Copy users (excluding system users if any)
        users = await conn.fetch(
            "SELECT id, login, password, display_name, description, user_tag_id, transport_account_id, cashier_account_id, customer_account_id, cash_register_id, created_by "
            "FROM usr WHERE node_id = $1", source_node_id
        )
        user_mapping = {}
        for user in users:
            # Map the user_tag_id to the new one if we have a mapping
            new_user_tag_id = None
            if user['user_tag_id'] is not None and user_tag_mapping:
                new_user_tag_id = user_tag_mapping.get(user['user_tag_id'])

            # Map the account IDs to the new ones if we have mappings
            new_transport_account_id = None
            if user['transport_account_id'] is not None and account_id_mapping:
                new_transport_account_id = account_id_mapping.get(user['transport_account_id'])

            new_cashier_account_id = None
            if user['cashier_account_id'] is not None and account_id_mapping:
                new_cashier_account_id = account_id_mapping.get(user['cashier_account_id'])

            # Create a new customer account for this user
            # Customer accounts don't have user_tag_id since they're not tied to RFID tags
            new_customer_account_id = await conn.fetchval(
                "INSERT INTO account (type, name, node_id) "
                "VALUES ($1, $2, $3) RETURNING id",
                'private', f"Customer account for {user['login']}", target_node_id
            )

            new_user_id = await conn.fetchval(
                "INSERT INTO usr (login, password, display_name, description, user_tag_id, transport_account_id, cashier_account_id, customer_account_id, cash_register_id, node_id, created_by) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
                user['login'], user['password'], user['display_name'], user['description'], new_user_tag_id,
                new_transport_account_id, new_cashier_account_id, new_customer_account_id, user['cash_register_id'],
                target_node_id, user['created_by']
            )
            user_mapping[user['id']] = new_user_id

            # Copy user to role associations
            user_roles = await conn.fetch(
                "SELECT role_id, terminal_only FROM user_to_role WHERE user_id = $1 AND node_id = $2", user['id'], source_node_id
            )
            for user_role in user_roles:
                if user_role['role_id'] in role_mapping:
                    await conn.execute(
                        "INSERT INTO user_to_role (user_id, role_id, node_id, terminal_only) VALUES ($1, $2, $3, $4)",
                        new_user_id, role_mapping[user_role['role_id']], target_node_id, user_role['terminal_only']
                    )

        return user_mapping

    async def _copy_products_and_tax_rates(self, conn: Connection, source_node_id: int, target_node_id: int):
        """Copy tax rates and products from source node to target node."""
        # First, get all tax rates referenced by products in the source node
        referenced_tax_rate_ids = await conn.fetch(
            "SELECT DISTINCT tax_rate_id FROM product WHERE node_id = $1 AND tax_rate_id IS NOT NULL", source_node_id
        )
        referenced_tax_ids = [row['tax_rate_id'] for row in referenced_tax_rate_ids]

        # Copy referenced tax rates (if they don't already exist in target)
        tax_mapping = {}
        used_tax_names = set()
        for tax_id in referenced_tax_ids:
            # Get the tax rate details
            tax = await conn.fetchrow(
                "SELECT id, name, rate, description, node_id FROM tax_rate WHERE id = $1", tax_id
            )
            if tax:
                # Check if this tax rate already exists in target node
                existing = await conn.fetchval(
                    "SELECT id FROM tax_rate WHERE node_id = $1 AND name = $2", target_node_id, tax['name']
                )
                if existing:
                    tax_mapping[tax['id']] = existing
                else:
                    unique_name = await self._generate_unique_name(conn, "tax_rate", "name", tax['name'], target_node_id, used_tax_names)
                    used_tax_names.add(unique_name)
                    new_tax_id = await conn.fetchval(
                        "INSERT INTO tax_rate (name, rate, description, node_id) VALUES ($1, $2, $3, $4) RETURNING id",
                        unique_name, tax['rate'], tax['description'], target_node_id
                    )
                    tax_mapping[tax['id']] = new_tax_id

        # Copy all products from the source node
        products = await conn.fetch(
            "SELECT id, name, type, price, fixed_price, price_in_vouchers, is_locked, is_returnable, target_account_id, tax_rate_id "
            "FROM product WHERE node_id = $1", source_node_id
        )
        product_mapping = {}
        used_product_names = set()
        for product in products:
            new_tax_id = tax_mapping.get(product['tax_rate_id'])
            if new_tax_id is not None:
                unique_name = await self._generate_unique_name(conn, "product", "name", product['name'], target_node_id, used_product_names)
                if unique_name is not None:  # Skip if duplicate
                    # Check if the product already exists in the target node
                    existing = await conn.fetchval(
                        "SELECT id FROM product WHERE node_id = $1 AND name = $2", target_node_id, unique_name
                    )
                    if not existing:
                        used_product_names.add(unique_name)
                        new_product_id = await conn.fetchval(
                            "INSERT INTO product (name, type, price, fixed_price, price_in_vouchers, is_locked, is_returnable, target_account_id, tax_rate_id, node_id) "
                            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
                            unique_name, product['type'], product['price'], product['fixed_price'], product['price_in_vouchers'],
                            product['is_locked'], product['is_returnable'], product['target_account_id'], new_tax_id, target_node_id
                        )
                        product_mapping[product['id']] = new_product_id

                        # Copy product restrictions
                        restrictions = await conn.fetch(
                            "SELECT restriction FROM product_restriction WHERE id = $1", product['id']
                        )
                        for restriction in restrictions:
                            await conn.execute(
                                "INSERT INTO product_restriction (id, restriction) VALUES ($1, $2)",
                                new_product_id, restriction['restriction']
                            )

        # Copy ticket metadata for ticket products
        ticket_metadata = await conn.fetch(
            "SELECT id, initial_top_up_amount FROM product_ticket_metadata WHERE id IN (SELECT ticket_metadata_id FROM product WHERE ticket_metadata_id IS NOT NULL AND node_id = $1)", source_node_id
        )
        ticket_metadata_mapping = {}
        for metadata in ticket_metadata:
            new_metadata_id = await conn.fetchval(
                "INSERT INTO product_ticket_metadata (initial_top_up_amount) VALUES ($1) RETURNING id",
                metadata['initial_top_up_amount']
            )
            ticket_metadata_mapping[metadata['id']] = new_metadata_id

        # Update ticket products to reference the new metadata
        for old_metadata_id, new_metadata_id in ticket_metadata_mapping.items():
            # Find products that reference this metadata and update them
            await conn.execute(
                "UPDATE product SET ticket_metadata_id = $1 WHERE ticket_metadata_id = $2 AND node_id = $3",
                new_metadata_id, old_metadata_id, target_node_id
            )

        return product_mapping

    async def _copy_tse_devices(self, conn: Connection, source_node_id: int, target_node_id: int):
        """Copy TSE devices from source node to target node."""
        tse_devices = await conn.fetch(
            "SELECT name, status, serial, hashalgo, time_format, public_key, certificate, process_data_encoding "
            "FROM tse WHERE node_id = $1", source_node_id
        )
        for tse in tse_devices:
            unique_name = await self._generate_unique_name(conn, "tse", "name", tse['name'], target_node_id)
            await conn.execute(
                "INSERT INTO tse (name, status, serial, hashalgo, time_format, public_key, certificate, process_data_encoding, node_id) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                unique_name, tse['status'], tse['serial'], tse['hashalgo'], tse['time_format'],
                tse['public_key'], tse['certificate'], tse['process_data_encoding'], target_node_id
            )

    @with_db_transaction
    @requires_node()
    @requires_user(privileges=[Privilege.node_administration])
    async def copy_event(self, conn: Connection, node: Node, request: CopyEventRequest) -> Node:
        """Copy an event with selective components based on the provided options."""
        if node.event_node_id is None:
            raise InvalidArgument("Cannot copy a node that is not an event")

        # Get the source event settings
        source_event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)

        # Create a new event with the same settings (or modified settings if not copying)
        new_event_data = NewEvent(
            name=request.name,
            description=request.description,
            currency_identifier=source_event.currency_identifier if request.options.copy_event_settings else "EUR",
            max_account_balance=source_event.max_account_balance if request.options.copy_event_settings else 150.0,
            vip_max_account_balance=source_event.vip_max_account_balance if request.options.copy_event_settings else 300.0,
            start_date=source_event.start_date if request.options.copy_event_settings else None,
            end_date=source_event.end_date if request.options.copy_event_settings else None,
            daily_end_time=source_event.daily_end_time if request.options.copy_event_settings else None,
            post_payment_allowed=source_event.post_payment_allowed if request.options.copy_event_settings else False,
            sumup_topup_enabled=source_event.sumup_topup_enabled if request.options.copy_event_settings else False,
            sumup_payment_enabled=source_event.sumup_payment_enabled if request.options.copy_event_settings else False,
            customer_portal_url=source_event.customer_portal_url if request.options.copy_event_settings else "",
            customer_portal_about_page_url=source_event.customer_portal_about_page_url if request.options.copy_event_settings else "",
            customer_portal_data_privacy_url=source_event.customer_portal_data_privacy_url if request.options.copy_event_settings else "",
            customer_portal_contact_email=source_event.customer_portal_contact_email if request.options.copy_event_settings else "contact@example.com",
            pretix_presale_enabled=source_event.pretix_presale_enabled if request.options.copy_event_settings else False,
            pretix_shop_url=source_event.pretix_shop_url if request.options.copy_event_settings else None,
            pretix_organizer=source_event.pretix_organizer if request.options.copy_event_settings else None,
            pretix_event=source_event.pretix_event if request.options.copy_event_settings else None,
            pretix_ticket_ids=source_event.pretix_ticket_ids if request.options.copy_event_settings else None,
            ust_id=source_event.ust_id if request.options.copy_event_settings else "DE123456789",
            bon_issuer=source_event.bon_issuer if request.options.copy_event_settings else "Event Organizer",
            bon_address=source_event.bon_address if request.options.copy_event_settings else "Event Address",
            bon_title=source_event.bon_title if request.options.copy_event_settings else request.name,
            sepa_enabled=source_event.sepa_enabled if request.options.copy_event_settings else False,
            sepa_sender_name=source_event.sepa_sender_name if request.options.copy_event_settings else "",
            sepa_sender_iban=source_event.sepa_sender_iban if request.options.copy_event_settings else "",
            sepa_description=source_event.sepa_description if request.options.copy_event_settings else "",
            sepa_max_num_payouts_in_run=source_event.sepa_max_num_payouts_in_run if request.options.copy_event_settings else 100,
            sepa_allowed_country_codes=source_event.sepa_allowed_country_codes if request.options.copy_event_settings else ["DE"],
            email_enabled=source_event.email_enabled if request.options.copy_event_settings else False,
            email_default_sender=source_event.email_default_sender if request.options.copy_event_settings else None,
            email_smtp_host=source_event.email_smtp_host if request.options.copy_event_settings else None,
            email_smtp_port=source_event.email_smtp_port if request.options.copy_event_settings else None,
            email_smtp_username=source_event.email_smtp_username if request.options.copy_event_settings else None,
            payout_sender=source_event.payout_sender if request.options.copy_event_settings else None,
            donation_enabled=source_event.donation_enabled if request.options.copy_event_settings else True,
            sumup_api_key="" if request.options.copy_event_settings else "",
            sumup_affiliate_key="" if request.options.copy_event_settings else "",
            sumup_merchant_code="" if request.options.copy_event_settings else "",
            sumup_oauth_client_id="" if request.options.copy_event_settings else "",
            sumup_oauth_client_secret="" if request.options.copy_event_settings else "",
            pretix_api_key=source_event.pretix_api_key if request.options.copy_event_settings else None,
        )

        # Create the new event node
        new_event_node = await create_event(conn=conn, parent_id=node.parent, event=new_event_data)

        # Copy selected components
        user_tag_mapping = {}
        if request.options.copy_user_tags:
            user_tag_mapping = await self._copy_user_tags(conn, node.id, new_event_node.id)

        account_id_mapping = {}
        if request.options.copy_account_balances:
            account_id_mapping = await self._copy_account_balances(conn, node.id, new_event_node.id, user_tag_mapping if request.options.copy_user_tags else None)

        profile_mapping = {}
        if request.options.copy_tills:
            profile_mapping = await self._copy_tills(conn, node.id, new_event_node.id)

        if request.options.copy_terminals:
            await self._copy_terminals(conn, node.id, new_event_node.id)

        if request.options.copy_users:
            await self._copy_users_and_roles(conn, node.id, new_event_node.id, user_tag_mapping if request.options.copy_user_tags else None, account_id_mapping if request.options.copy_account_balances else None)

        if request.options.copy_products:
            await self._copy_products_and_tax_rates(conn, node.id, new_event_node.id)

        if request.options.copy_tse_devices:
            await self._copy_tse_devices(conn, node.id, new_event_node.id)

        if request.options.copy_sub_nodes:
            await self._copy_sub_nodes(conn, node.id, new_event_node.id, request.options)

        # Create tills for the new event using copied profiles if available
        if profile_mapping:
            # Create virtual till using first available profile
            first_profile_id = next(iter(profile_mapping.values()))
            unique_till_name = await self._generate_unique_name(conn, "till", "name", "Virtual Till", new_event_node.id)
            await conn.execute(
                "INSERT INTO till (name, description, active_profile_id, node_id, is_virtual) "
                "VALUES ($1, '', $2, $3, true)",
                unique_till_name, first_profile_id, new_event_node.id
            )

        return new_event_node
