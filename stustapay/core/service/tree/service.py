import asyncpg
from sftkit.database import Connection
from sftkit.error import InvalidArgument, NotFound
from sftkit.service import Service, with_db_transaction

from stustapay.bon.bon import BonJson, generate_dummy_bon_json
from stustapay.bon.revenue_report import generate_dummy_report, generate_report
from stustapay.core.banner_image import http_response_for_stored_banner, validate_and_prepare_banner_upload
from stustapay.core.config import Config
from stustapay.core.schema.account import AccountType
from stustapay.core.schema.product import ProductType
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
from stustapay.core.service.tree.common import (
    fetch_node,
    fetch_restricted_event_settings_for_node,
    get_tree_for_current_user,
)
from stustapay.payment.sumup.api import fetch_refresh_token_from_auth_code

EVENT_SYSTEM_ACCOUNT_TYPES = {
    AccountType.cash_entry.value,
    AccountType.cash_exit.value,
    AccountType.sale_exit.value,
    AccountType.sumup_entry.value,
    AccountType.sumup_online_entry.value,
    AccountType.cash_imbalance.value,
    AccountType.cash_vault.value,
    AccountType.cash_topup_source.value,
    AccountType.voucher_create.value,
    AccountType.donation_exit.value,
    AccountType.sepa_exit.value,
}

PREPROVISIONED_PRODUCT_TYPES = {
    ProductType.discount.value,
    ProductType.topup.value,
    ProductType.payout.value,
    ProductType.money_transfer.value,
    ProductType.imbalance.value,
}

COPY_EVENT_SETTINGS_MODEL_EXCLUDES = {
    "id",
    "languages",
    "sumup_oauth_refresh_token",
    "customer_portal_banner_image_url",
}

OPTIONAL_EVENT_DB_COLUMNS = {
    "expected_visitors_per_day",
    "customer_portal_primary_color",
    "customer_portal_secondary_color",
    "customer_portal_background_color",
    "wifi_ssid",
    "wifi_passphrase",
}

PRIVATE_EVENT_METADATA_COLUMNS = (
    "sumup_oauth_refresh_token",
    "banner_image",
    "banner_image_mime_type",
)


async def _fetch_event_table_columns(conn: Connection) -> set[str]:
    columns = await conn.fetch(
        "select column_name from information_schema.columns where table_schema = current_schema() and table_name = 'event'"
    )
    return {column["column_name"] for column in columns}


def _build_event_db_values(event: NewEvent, available_columns: set[str]) -> list[tuple[str, object]]:
    values: list[tuple[str, object]] = [
        ("currency_identifier", event.currency_identifier),
        ("sumup_topup_enabled", event.sumup_topup_enabled),
        ("max_account_balance", event.max_account_balance),
        ("vip_max_account_balance", event.vip_max_account_balance),
        ("ust_id", event.ust_id),
        ("bon_issuer", event.bon_issuer),
        ("bon_address", event.bon_address),
        ("bon_title", event.bon_title),
        ("customer_portal_contact_email", event.customer_portal_contact_email),
        ("sepa_enabled", event.sepa_enabled),
        ("sepa_sender_name", event.sepa_sender_name),
        ("sepa_sender_iban", event.sepa_sender_iban),
        ("sepa_description", event.sepa_description),
        ("sepa_allowed_country_codes", event.sepa_allowed_country_codes),
        ("customer_portal_url", event.customer_portal_url),
        ("customer_portal_about_page_url", event.customer_portal_about_page_url),
        ("customer_portal_data_privacy_url", event.customer_portal_data_privacy_url),
        ("sumup_payment_enabled", event.sumup_payment_enabled),
        ("sumup_api_key", event.sumup_api_key),
        ("sumup_affiliate_key", event.sumup_affiliate_key),
        ("sumup_merchant_code", event.sumup_merchant_code),
        ("start_date", event.start_date),
        ("end_date", event.end_date),
        ("daily_end_time", event.daily_end_time),
        ("email_enabled", event.email_enabled),
        ("email_default_sender", event.email_default_sender),
        ("email_smtp_host", event.email_smtp_host),
        ("email_smtp_port", event.email_smtp_port),
        ("email_smtp_username", event.email_smtp_username),
        ("email_smtp_password", event.email_smtp_password),
        ("payout_sender", event.payout_sender),
        ("sumup_oauth_client_id", event.sumup_oauth_client_id),
        ("sumup_oauth_client_secret", event.sumup_oauth_client_secret),
        ("pretix_presale_enabled", event.pretix_presale_enabled),
        ("pretix_shop_url", event.pretix_shop_url),
        ("pretix_api_key", event.pretix_api_key),
        ("pretix_organizer", event.pretix_organizer),
        ("pretix_event", event.pretix_event),
        ("pretix_ticket_ids", event.pretix_ticket_ids),
        ("post_payment_allowed", event.post_payment_allowed),
        ("donation_enabled", event.donation_enabled),
    ]
    optional_values = {
        "expected_visitors_per_day": event.expected_visitors_per_day,
        "customer_portal_primary_color": event.customer_portal_primary_color,
        "customer_portal_secondary_color": event.customer_portal_secondary_color,
        "customer_portal_background_color": event.customer_portal_background_color,
        "wifi_ssid": event.wifi_ssid,
        "wifi_passphrase": event.wifi_passphrase,
    }
    for column_name, value in optional_values.items():
        if column_name in available_columns:
            values.append((column_name, value))
    return values


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


async def _copy_event_private_metadata(conn: Connection, source_event_id: int, target_event_id: int):
    available_columns = await _fetch_event_table_columns(conn)
    metadata_columns = [column for column in PRIVATE_EVENT_METADATA_COLUMNS if column in available_columns]
    if not metadata_columns:
        return

    source_metadata = await conn.fetchrow(
        f"select {', '.join(metadata_columns)} from event where id = $1",
        source_event_id,
    )
    if source_metadata is None:
        return

    assignments = ", ".join(f"{column} = ${index}" for index, column in enumerate(metadata_columns, start=1))
    await conn.execute(
        f"update event set {assignments} where id = ${len(metadata_columns) + 1}",
        *(source_metadata[column] for column in metadata_columns),
        target_event_id,
    )


async def _build_existing_account_mapping(conn: Connection, source_node_id: int, target_node_id: int) -> dict[int, int]:
    source_accounts = await conn.fetch(
        "select id, type from account where node_id = $1 and type = any($2)",
        source_node_id,
        list(EVENT_SYSTEM_ACCOUNT_TYPES),
    )
    target_accounts = await conn.fetch(
        "select id, type from account where node_id = $1 and type = any($2)",
        target_node_id,
        list(EVENT_SYSTEM_ACCOUNT_TYPES),
    )
    target_by_type = {account["type"]: account["id"] for account in target_accounts}
    return {account["id"]: target_by_type[account["type"]] for account in source_accounts if account["type"] in target_by_type}


async def _build_existing_product_mapping(conn: Connection, source_node_id: int, target_node_id: int) -> dict[int, int]:
    source_products = await conn.fetch(
        "select id, type from product where node_id = $1 and type = any($2)",
        source_node_id,
        list(PREPROVISIONED_PRODUCT_TYPES),
    )
    target_products = await conn.fetch(
        "select id, type from product where node_id = $1 and type = any($2)",
        target_node_id,
        list(PREPROVISIONED_PRODUCT_TYPES),
    )
    target_by_type = {product["type"]: product["id"] for product in target_products}
    return {product["id"]: target_by_type[product["type"]] for product in source_products if product["type"] in target_by_type}


async def _ensure_user_tag_secret_mapping(
    conn: Connection, source_secret_id: int, target_node_id: int, secret_mapping: dict[int, int]
) -> int | None:
    if source_secret_id in secret_mapping:
        return secret_mapping[source_secret_id]

    source_secret = await conn.fetchrow(
        "select encode(key0, 'hex') as key0, encode(key1, 'hex') as key1, description "
        "from user_tag_secret where id = $1",
        source_secret_id,
    )
    if source_secret is None:
        return None

    target_event_node_id = await conn.fetchval("select event_node_id from node where id = $1", target_node_id)
    if target_event_node_id is None:
        return None

    target_secret_id = await conn.fetchval("select id from user_tag_secret where node_id = $1", target_event_node_id)
    if target_secret_id is None:
        target_secret_id = await conn.fetchval(
            "insert into user_tag_secret (key0, key1, description, node_id) "
            "values (decode($1, 'hex'), decode($2, 'hex'), $3, $4) returning id",
            source_secret["key0"],
            source_secret["key1"],
            source_secret["description"],
            target_event_node_id,
        )

    secret_mapping[source_secret_id] = target_secret_id
    return target_secret_id


async def create_event(conn: Connection, parent_id: int, event: NewEvent) -> Node:
    # TODO: tree, create all needed resources, e.g. global accounts which have to and should
    #  only exist at an event node
    event_columns = await _fetch_event_table_columns(conn)
    event_values = _build_event_db_values(event, event_columns)
    column_names = ", ".join(column for column, _ in event_values)
    placeholders = ", ".join(f"${index}" for index in range(1, len(event_values) + 1))
    event_id = await conn.fetchval(
        f"insert into event ({column_names}) values ({placeholders}) returning id",
        *(value for _, value in event_values),
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

        event_columns = await _fetch_event_table_columns(conn)
        event_values = _build_event_db_values(event, event_columns)
        assignments = ", ".join(f"{column} = ${index}" for index, (column, _) in enumerate(event_values, start=2))
        await conn.execute(
            f"update event set {assignments} where id = $1",
            event_id,
            *(value for _, value in event_values),
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
        params: list[int | str] = [current_user.id]
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


    async def _copy_user_tags(
        self,
        conn: Connection,
        source_node_id: int,
        target_node_id: int,
        secret_mapping: dict[int, int] | None = None,
    ):
        """Copy user tags from source node to target node."""
        secret_mapping = secret_mapping or {}
        user_tags = await conn.fetch(
            "SELECT id, uid, pin, restriction, comment, secret_id, is_vip, group_tag, account_creation_blocked "
            "FROM user_tag WHERE node_id = $1",
            source_node_id,
        )

        user_tag_mapping = {}
        for tag in user_tags:
            new_secret_id = None
            if tag["secret_id"] is not None:
                new_secret_id = await _ensure_user_tag_secret_mapping(
                    conn=conn,
                    source_secret_id=tag["secret_id"],
                    target_node_id=target_node_id,
                    secret_mapping=secret_mapping,
                )

            new_tag_id = await conn.fetchval(
                "INSERT INTO user_tag (uid, pin, restriction, comment, secret_id, node_id, is_vip, group_tag, account_creation_blocked) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
                tag["uid"],
                tag["pin"],
                tag["restriction"],
                tag["comment"],
                new_secret_id,
                target_node_id,
                tag["is_vip"],
                tag["group_tag"],
                tag["account_creation_blocked"],
            )
            user_tag_mapping[tag["id"]] = new_tag_id

        return user_tag_mapping

    async def _copy_account_balances(
        self,
        conn: Connection,
        source_node_id: int,
        target_node_id: int,
        user_tag_mapping: dict[int, int] | None = None,
        existing_account_mapping: dict[int, int] | None = None,
    ):
        """Copy account balances from source node to target node."""
        accounts = await conn.fetch(
            "SELECT id, user_tag_id, type, name, comment, balance, vouchers FROM account "
            "WHERE node_id = $1",
            source_node_id,
        )

        account_id_mapping = dict(existing_account_mapping or {})
        for account in accounts:
            if account["id"] in account_id_mapping:
                continue

            new_user_tag_id = None
            if account["user_tag_id"] is not None and user_tag_mapping:
                new_user_tag_id = user_tag_mapping.get(account["user_tag_id"])

            new_account_id = await conn.fetchval(
                "INSERT INTO account (user_tag_id, type, name, comment, balance, vouchers, node_id) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                new_user_tag_id,
                account["type"],
                account["name"],
                account["comment"],
                account["balance"] if account["balance"] > 0 else 0,
                account["vouchers"] if account["vouchers"] > 0 else 0,
                target_node_id,
            )
            account_id_mapping[account["id"]] = new_account_id

        return account_id_mapping

    async def _generate_unique_name(self, conn: Connection, table_name: str, name_column: str, original_name: str, scope_id: int, exclude_names: set[str] | None = None) -> str | None:
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

    async def _copy_tills(
        self,
        conn: Connection,
        source_node_id: int,
        target_node_id: int,
        product_mapping: dict[int, int] | None = None,
        terminal_mapping: dict[int, int] | None = None,
    ):
        """Copy till layouts, profiles, buttons, and registers from source node to target node."""
        product_mapping = product_mapping or {}
        terminal_mapping = terminal_mapping or {}

        referenced_profile_ids = await conn.fetch(
            "SELECT DISTINCT active_profile_id FROM till WHERE node_id = $1 AND active_profile_id IS NOT NULL",
            source_node_id,
        )
        referenced_profile_ids_set = set(row["active_profile_id"] for row in referenced_profile_ids)

        if referenced_profile_ids_set:
            referenced_layout_ids = await conn.fetch(
                "SELECT DISTINCT layout_id FROM till_profile WHERE id = ANY($1) AND layout_id IS NOT NULL",
                list(referenced_profile_ids_set),
            )
            referenced_layout_ids_set = set(row["layout_id"] for row in referenced_layout_ids)
        else:
            referenced_layout_ids_set = set()

        layout_mapping: dict[int, int] = {}
        used_layout_names: set[str] = set()
        for layout_id in referenced_layout_ids_set:
            layout = await conn.fetchrow(
                "SELECT id, name, description FROM till_layout WHERE id = $1",
                layout_id,
            )
            if layout is None:
                continue

            existing = await conn.fetchval(
                "SELECT id FROM till_layout WHERE node_id = $1 AND name = $2",
                target_node_id,
                layout["name"],
            )
            if existing:
                layout_mapping[layout["id"]] = existing
                await conn.execute(
                    "UPDATE till_layout SET description = $2 WHERE id = $1",
                    existing,
                    layout["description"],
                )
            else:
                unique_name = await self._generate_unique_name(
                    conn, "till_layout", "name", layout["name"], target_node_id, used_layout_names
                )
                assert unique_name is not None
                used_layout_names.add(unique_name)
                new_layout_id = await conn.fetchval(
                    "INSERT INTO till_layout (name, description, node_id) VALUES ($1, $2, $3) RETURNING id",
                    unique_name,
                    layout["description"],
                    target_node_id,
                )
                layout_mapping[layout["id"]] = new_layout_id

        profile_mapping: dict[int, int] = {}
        used_profile_names: set[str] = set()
        for profile_id in referenced_profile_ids_set:
            profile = await conn.fetchrow(
                "SELECT id, name, description, allow_top_up, allow_cash_out, allow_ticket_sale, allow_ticket_vouchers, "
                "enable_ssp_payment, enable_cash_payment, enable_card_payment, layout_id "
                "FROM till_profile WHERE id = $1",
                profile_id,
            )
            if profile is None:
                continue

            new_layout_id = layout_mapping.get(profile["layout_id"])
            if new_layout_id is None:
                continue

            existing = await conn.fetchval(
                "SELECT id FROM till_profile WHERE node_id = $1 AND name = $2",
                target_node_id,
                profile["name"],
            )
            if existing:
                profile_mapping[profile["id"]] = existing
                await conn.execute(
                    "UPDATE till_profile SET description = $2, allow_top_up = $3, allow_cash_out = $4, "
                    "allow_ticket_sale = $5, allow_ticket_vouchers = $6, enable_ssp_payment = $7, "
                    "enable_cash_payment = $8, enable_card_payment = $9, layout_id = $10 WHERE id = $1",
                    existing,
                    profile["description"],
                    profile["allow_top_up"],
                    profile["allow_cash_out"],
                    profile["allow_ticket_sale"],
                    profile["allow_ticket_vouchers"],
                    profile["enable_ssp_payment"],
                    profile["enable_cash_payment"],
                    profile["enable_card_payment"],
                    new_layout_id,
                )
            else:
                unique_name = await self._generate_unique_name(
                    conn, "till_profile", "name", profile["name"], target_node_id, used_profile_names
                )
                assert unique_name is not None
                used_profile_names.add(unique_name)
                new_profile_id = await conn.fetchval(
                    "INSERT INTO till_profile (name, description, allow_top_up, allow_cash_out, allow_ticket_sale, "
                    "allow_ticket_vouchers, enable_ssp_payment, enable_cash_payment, enable_card_payment, layout_id, node_id) "
                    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
                    unique_name,
                    profile["description"],
                    profile["allow_top_up"],
                    profile["allow_cash_out"],
                    profile["allow_ticket_sale"],
                    profile["allow_ticket_vouchers"],
                    profile["enable_ssp_payment"],
                    profile["enable_cash_payment"],
                    profile["enable_card_payment"],
                    new_layout_id,
                    target_node_id,
                )
                profile_mapping[profile["id"]] = new_profile_id

        buttons = await conn.fetch("SELECT id, name FROM till_button WHERE node_id = $1", source_node_id)
        button_mapping: dict[int, int] = {}
        used_button_names: set[str] = set()
        for button in buttons:
            unique_name = await self._generate_unique_name(
                conn, "till_button", "name", button["name"], target_node_id, used_button_names
            )
            assert unique_name is not None
            used_button_names.add(unique_name)
            new_button_id = await conn.fetchval(
                "INSERT INTO till_button (name, node_id) VALUES ($1, $2) RETURNING id",
                unique_name,
                target_node_id,
            )
            button_mapping[button["id"]] = new_button_id

        for old_button_id, new_button_id in button_mapping.items():
            products = await conn.fetch(
                "SELECT product_id FROM till_button_product WHERE button_id = $1",
                old_button_id,
            )
            for product in products:
                new_product_id = product_mapping.get(product["product_id"])
                if new_product_id is None:
                    continue
                await conn.execute(
                    "INSERT INTO till_button_product (button_id, product_id) VALUES ($1, $2)",
                    new_button_id,
                    new_product_id,
                )

        for old_layout_id, new_layout_id in layout_mapping.items():
            await conn.execute("DELETE FROM till_layout_to_button WHERE layout_id = $1", new_layout_id)
            await conn.execute("DELETE FROM till_layout_to_ticket WHERE layout_id = $1", new_layout_id)

            buttons_in_layout = await conn.fetch(
                "SELECT button_id, sequence_number FROM till_layout_to_button WHERE layout_id = $1",
                old_layout_id,
            )
            for button_assoc in buttons_in_layout:
                mapped_button_id = button_mapping.get(button_assoc["button_id"])
                if mapped_button_id is None:
                    continue
                await conn.execute(
                    "INSERT INTO till_layout_to_button (layout_id, button_id, sequence_number) VALUES ($1, $2, $3)",
                    new_layout_id,
                    mapped_button_id,
                    button_assoc["sequence_number"],
                )

            tickets_in_layout = await conn.fetch(
                "SELECT ticket_id, sequence_number FROM till_layout_to_ticket WHERE layout_id = $1",
                old_layout_id,
            )
            for ticket_assoc in tickets_in_layout:
                mapped_ticket_id = product_mapping.get(ticket_assoc["ticket_id"])
                if mapped_ticket_id is None:
                    continue
                await conn.execute(
                    "INSERT INTO till_layout_to_ticket (layout_id, ticket_id, sequence_number) VALUES ($1, $2, $3)",
                    new_layout_id,
                    mapped_ticket_id,
                    ticket_assoc["sequence_number"],
                )

        target_virtual_till_id = await conn.fetchval(
            "SELECT id FROM till WHERE node_id = $1 AND is_virtual = true",
            target_node_id,
        )
        tills = await conn.fetch(
            "SELECT id, name, description, active_profile_id, terminal_id, is_virtual "
            "FROM till WHERE node_id = $1",
            source_node_id,
        )
        for till in tills:
            new_profile_id = profile_mapping.get(till["active_profile_id"])
            if new_profile_id is None:
                continue

            mapped_terminal_id = terminal_mapping.get(till["terminal_id"]) if till["terminal_id"] is not None else None
            if till["is_virtual"]:
                if target_virtual_till_id is not None:
                    await conn.execute(
                        "UPDATE till SET description = $2, active_profile_id = $3, terminal_id = null WHERE id = $1",
                        target_virtual_till_id,
                        till["description"],
                        new_profile_id,
                    )
                continue

            unique_till_name = await self._generate_unique_name(conn, "till", "name", till["name"], target_node_id)
            assert unique_till_name is not None
            await conn.execute(
                "INSERT INTO till (name, description, active_profile_id, node_id, is_virtual, terminal_id) "
                "VALUES ($1, $2, $3, $4, false, $5)",
                unique_till_name,
                till["description"],
                new_profile_id,
                target_node_id,
                mapped_terminal_id,
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
        account_id_mapping = await _build_existing_account_mapping(conn, source_node_id, target_node_id)
        product_mapping = await _build_existing_product_mapping(conn, source_node_id, target_node_id)
        user_tag_mapping: dict[int, int] = {}

        if copy_options.copy_user_tags:
            user_tag_mapping = await self._copy_user_tags(conn, source_node_id, target_node_id)

        if copy_options.copy_account_balances:
            account_id_mapping = await self._copy_account_balances(
                conn,
                source_node_id,
                target_node_id,
                user_tag_mapping if copy_options.copy_user_tags else None,
                existing_account_mapping=account_id_mapping,
            )

        if copy_options.copy_products:
            product_mapping = await self._copy_products_and_tax_rates(
                conn,
                source_node_id,
                target_node_id,
                account_id_mapping=account_id_mapping,
                existing_product_mapping=product_mapping,
            )

        terminal_mapping: dict[int, int] = {}

        if copy_options.copy_terminals:
            terminal_mapping = await self._copy_terminals(conn, source_node_id, target_node_id)

        if copy_options.copy_tills:
            await self._copy_tills(
                conn,
                source_node_id,
                target_node_id,
                product_mapping=product_mapping,
                terminal_mapping=terminal_mapping,
            )

        if copy_options.copy_users:
            await self._copy_users_and_roles(
                conn,
                source_node_id,
                target_node_id,
                user_tag_mapping if copy_options.copy_user_tags else None,
                account_id_mapping,
            )

        if copy_options.copy_tse_devices:
            await self._copy_tse_devices(conn, source_node_id, target_node_id)

    async def _copy_terminals(self, conn: Connection, source_node_id: int, target_node_id: int):
        """Copy terminals from source node to target node."""
        terminals = await conn.fetch(
            "SELECT id, name, description, mode FROM terminal WHERE node_id = $1",
            source_node_id,
        )
        used_terminal_names: set[str] = set()
        terminal_mapping: dict[int, int] = {}
        for terminal in terminals:
            unique_name = await self._generate_unique_name(conn, "terminal", "name", terminal['name'], target_node_id, used_terminal_names)
            assert unique_name is not None
            used_terminal_names.add(unique_name)
            new_terminal_id = await conn.fetchval(
                "INSERT INTO terminal (name, description, node_id, mode, entry_area_id) VALUES ($1, $2, $3, $4, null) RETURNING id",
                unique_name,
                terminal['description'],
                target_node_id,
                terminal["mode"],
            )
            terminal_mapping[terminal["id"]] = new_terminal_id

        return terminal_mapping

    async def _copy_users_and_roles(self, conn: Connection, source_node_id: int, target_node_id: int, user_tag_mapping: dict[int, int] | None = None, account_id_mapping: dict[int, int] | None = None):
        """Copy user roles and users from source node to target node."""
        roles = await conn.fetch(
            "SELECT id, name, is_privileged FROM user_role WHERE node_id = $1", source_node_id
        )
        role_mapping: dict[int, int] = {}
        used_role_names: set[str] = set()
        for role in roles:
            unique_name = await self._generate_unique_name(conn, "user_role", "name", role['name'], target_node_id, used_role_names)
            assert unique_name is not None
            used_role_names.add(unique_name)
            new_role_id = await conn.fetchval(
                "INSERT INTO user_role (name, is_privileged, node_id) VALUES ($1, $2, $3) RETURNING id",
                unique_name, role['is_privileged'], target_node_id
            )
            role_mapping[role['id']] = new_role_id

            privileges = await conn.fetch(
                "SELECT privilege FROM user_role_to_privilege WHERE role_id = $1", role['id']
            )
            for privilege in privileges:
                await conn.execute(
                    "INSERT INTO user_role_to_privilege (role_id, privilege) VALUES ($1, $2)",
                    new_role_id, privilege['privilege']
                )

        users = await conn.fetch(
            "SELECT id, login, password, display_name, description, user_tag_id, transport_account_id, cashier_account_id, "
            "customer_account_id, cash_register_id, created_by, email FROM usr WHERE node_id = $1",
            source_node_id,
        )
        user_mapping: dict[int, int] = {}
        for user in users:
            new_user_tag_id = None
            if user['user_tag_id'] is not None and user_tag_mapping:
                new_user_tag_id = user_tag_mapping.get(user['user_tag_id'])

            new_transport_account_id = None
            if user['transport_account_id'] is not None and account_id_mapping:
                new_transport_account_id = account_id_mapping.get(user['transport_account_id'])

            new_cashier_account_id = None
            if user['cashier_account_id'] is not None and account_id_mapping:
                new_cashier_account_id = account_id_mapping.get(user['cashier_account_id'])

            new_customer_account_id = None
            if user["customer_account_id"] is not None and account_id_mapping:
                new_customer_account_id = account_id_mapping.get(user["customer_account_id"])
            if new_customer_account_id is None:
                new_customer_account_id = await conn.fetchval(
                    "INSERT INTO account (type, name, node_id) VALUES ($1, $2, $3) RETURNING id",
                    "private",
                    f"Customer account for {user['login']}",
                    target_node_id,
                )

            new_user_id = await conn.fetchval(
                "INSERT INTO usr (login, password, display_name, description, user_tag_id, transport_account_id, cashier_account_id, customer_account_id, cash_register_id, node_id, created_by, email) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, null, $9, null, $10) RETURNING id",
                user["login"],
                user['password'],
                user['display_name'],
                user['description'],
                new_user_tag_id,
                new_transport_account_id,
                new_cashier_account_id,
                new_customer_account_id,
                target_node_id,
                user["email"],
            )
            user_mapping[user['id']] = new_user_id

        for user in users:
            new_created_by = None
            if user["created_by"] is not None:
                new_created_by = user_mapping.get(user["created_by"])
            await conn.execute("UPDATE usr SET created_by = $1 WHERE id = $2", new_created_by, user_mapping[user["id"]])

            user_roles = await conn.fetch(
                "SELECT role_id, terminal_only FROM user_to_role WHERE user_id = $1 AND node_id = $2", user['id'], source_node_id
            )
            for user_role in user_roles:
                if user_role['role_id'] in role_mapping:
                    await conn.execute(
                        "INSERT INTO user_to_role (user_id, role_id, node_id, terminal_only) VALUES ($1, $2, $3, $4)",
                        user_mapping[user["id"]], role_mapping[user_role['role_id']], target_node_id, user_role['terminal_only']
                    )

        return user_mapping

    async def _copy_products_and_tax_rates(
        self,
        conn: Connection,
        source_node_id: int,
        target_node_id: int,
        account_id_mapping: dict[int, int] | None = None,
        existing_product_mapping: dict[int, int] | None = None,
    ):
        """Copy tax rates and products from source node to target node."""
        account_id_mapping = account_id_mapping or {}
        product_mapping = dict(existing_product_mapping or {})

        referenced_tax_rate_ids = await conn.fetch(
            "SELECT DISTINCT tax_rate_id FROM product WHERE node_id = $1 AND tax_rate_id IS NOT NULL", source_node_id
        )
        referenced_tax_ids = [row['tax_rate_id'] for row in referenced_tax_rate_ids]

        tax_mapping: dict[int, int] = {}
        used_tax_names: set[str] = set()
        for tax_id in referenced_tax_ids:
            tax = await conn.fetchrow(
                "SELECT id, name, rate, description, node_id FROM tax_rate WHERE id = $1", tax_id
            )
            if tax is None:
                continue

            existing = await conn.fetchval(
                "SELECT id FROM tax_rate WHERE node_id = $1 AND name = $2", target_node_id, tax['name']
            )
            if existing:
                tax_mapping[tax['id']] = existing
                await conn.execute(
                    "UPDATE tax_rate SET rate = $2, description = $3 WHERE id = $1",
                    existing,
                    tax["rate"],
                    tax["description"],
                )
            else:
                unique_name = await self._generate_unique_name(conn, "tax_rate", "name", tax['name'], target_node_id, used_tax_names)
                assert unique_name is not None
                used_tax_names.add(unique_name)
                new_tax_id = await conn.fetchval(
                    "INSERT INTO tax_rate (name, rate, description, node_id) VALUES ($1, $2, $3, $4) RETURNING id",
                    unique_name, tax['rate'], tax['description'], target_node_id
                )
                tax_mapping[tax['id']] = new_tax_id

        products = await conn.fetch(
            "SELECT id, name, type, price, fixed_price, price_in_vouchers, is_locked, is_returnable, target_account_id, tax_rate_id, ticket_metadata_id "
            "FROM product WHERE node_id = $1", source_node_id
        )
        ticket_metadata_ids = [product["ticket_metadata_id"] for product in products if product["ticket_metadata_id"] is not None]
        ticket_metadata_rows = await conn.fetch(
            "SELECT id, initial_top_up_amount FROM product_ticket_metadata WHERE id = ANY($1)",
            ticket_metadata_ids or [0],
        )
        ticket_metadata_by_id = {
            metadata["id"]: metadata["initial_top_up_amount"] for metadata in ticket_metadata_rows
        }
        ticket_metadata_mapping: dict[int, int] = {}
        used_product_names: set[str] = set()
        for product in products:
            new_tax_id = tax_mapping.get(product['tax_rate_id'])
            if new_tax_id is None:
                continue

            new_ticket_metadata_id = None
            if product["ticket_metadata_id"] is not None:
                if product["ticket_metadata_id"] not in ticket_metadata_mapping:
                    ticket_metadata_mapping[product["ticket_metadata_id"]] = await conn.fetchval(
                        "INSERT INTO product_ticket_metadata (initial_top_up_amount) VALUES ($1) RETURNING id",
                        ticket_metadata_by_id[product["ticket_metadata_id"]],
                    )
                new_ticket_metadata_id = ticket_metadata_mapping[product["ticket_metadata_id"]]

            target_account_id = None
            if product["target_account_id"] is not None:
                target_account_id = account_id_mapping.get(product["target_account_id"])

            existing = product_mapping.get(product["id"])
            if existing is None and product["type"] not in PREPROVISIONED_PRODUCT_TYPES:
                existing = await conn.fetchval(
                    "SELECT id FROM product WHERE node_id = $1 AND name = $2",
                    target_node_id,
                    product["name"],
                )
            if existing is None:
                unique_name = await self._generate_unique_name(conn, "product", "name", product["name"], target_node_id, used_product_names)
                if unique_name is None:
                    continue
                used_product_names.add(unique_name)
                existing = await conn.fetchval(
                    "INSERT INTO product (name, type, price, fixed_price, price_in_vouchers, is_locked, is_returnable, target_account_id, tax_rate_id, node_id, ticket_metadata_id) "
                    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
                    unique_name,
                    product["type"],
                    product["price"],
                    product["fixed_price"],
                    product["price_in_vouchers"],
                    product["is_locked"],
                    product["is_returnable"],
                    target_account_id,
                    new_tax_id,
                    target_node_id,
                    new_ticket_metadata_id,
                )

            product_mapping[product["id"]] = existing
            await conn.execute(
                "UPDATE product SET name = $2, type = $3, price = $4, fixed_price = $5, price_in_vouchers = $6, "
                "is_locked = $7, is_returnable = $8, target_account_id = $9, tax_rate_id = $10, ticket_metadata_id = $11 "
                "WHERE id = $1",
                existing,
                product["name"],
                product["type"],
                product["price"],
                product["fixed_price"],
                product["price_in_vouchers"],
                product["is_locked"],
                product["is_returnable"],
                target_account_id,
                new_tax_id,
                new_ticket_metadata_id,
            )

            await conn.execute("DELETE FROM product_restriction WHERE id = $1", existing)
            restrictions = await conn.fetch(
                "SELECT restriction FROM product_restriction WHERE id = $1",
                product["id"],
            )
            for restriction in restrictions:
                await conn.execute(
                    "INSERT INTO product_restriction (id, restriction) VALUES ($1, $2)",
                    existing,
                    restriction["restriction"],
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

        source_event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)

        if request.options.copy_event_settings:
            copied_event_payload = source_event.model_dump(exclude=COPY_EVENT_SETTINGS_MODEL_EXCLUDES)
            copied_event_payload.update({"name": request.name, "description": request.description})
            new_event_data = NewEvent.model_validate(copied_event_payload)
        else:
            new_event_data = NewEvent(
                name=request.name,
                description=request.description,
                currency_identifier="EUR",
                max_account_balance=150.0,
                vip_max_account_balance=300.0,
                sumup_topup_enabled=False,
                sumup_payment_enabled=False,
                customer_portal_url="",
                customer_portal_about_page_url="",
                customer_portal_data_privacy_url="",
                customer_portal_contact_email="contact@example.com",
                pretix_presale_enabled=False,
                pretix_shop_url=None,
                pretix_organizer=None,
                pretix_event=None,
                pretix_ticket_ids=None,
                ust_id="DE123456789",
                bon_issuer="Event Organizer",
                bon_address="Event Address",
                bon_title=request.name,
                sepa_enabled=False,
                sepa_sender_name="",
                sepa_sender_iban="",
                sepa_description="",
                sepa_max_num_payouts_in_run=100,
                sepa_allowed_country_codes=["DE"],
                email_enabled=False,
                donation_enabled=True,
                sumup_api_key="",
                sumup_affiliate_key="",
                sumup_merchant_code="",
                sumup_oauth_client_id="",
                sumup_oauth_client_secret="",
                pretix_api_key=None,
                wifi_ssid=None,
                wifi_passphrase=None,
            )

        new_event_node = await create_event(conn=conn, parent_id=node.parent, event=new_event_data)
        assert new_event_node.event is not None

        if request.options.copy_event_settings:
            await _copy_event_private_metadata(conn, source_event.id, new_event_node.event.id)

        await self._copy_node_contents(conn, node.id, new_event_node.id, request.options)
        if request.options.copy_sub_nodes:
            await self._copy_sub_nodes(conn, node.id, new_event_node.id, request.options)

        copied_node = await fetch_node(conn=conn, node_id=new_event_node.id)
        assert copied_node is not None
        return copied_node
