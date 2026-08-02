# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import secrets

import pytest
from sftkit.database import Connection

from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, NewNode
from stustapay.core.schema.user import NewUser, NewUserRole, NodePrivilege
from stustapay.core.service.common.error import AccessDenied, NotFound
from stustapay.core.service.tree.service import create_event, create_node
from stustapay.core.service.user import UserService, associate_user_to_role


def _new_test_event() -> NewEvent:
    return NewEvent(
        name=secrets.token_hex(16),
        description="",
        customer_portal_url="http://localhost:4300",
        customer_portal_contact_email="test@test.support.test.com",
        customer_portal_about_page_url="",
        customer_portal_data_privacy_url="",
        currency_identifier="EUR",
        sepa_enabled=True,
        sepa_sender_name="Event Foobar",
        sepa_description="foobar {user_tag_uid}",
        sepa_sender_iban="DE89370400440532013000",
        sepa_allowed_country_codes=["DE"],
        bon_title="",
        bon_issuer="",
        bon_street="",
        bon_zip="",
        bon_city="",
        bon_country="DEU",
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
        payout_done_subject="[StuStaPay] Payout Completed",
        payout_done_message="Thank you for your patience. The payout process has been completed and the funds should arrive within the next days to your specified bank account.",
        payout_registered_subject="[StuStaPay] Registered for Payout",
        payout_registered_message="Thank you for being part of our festival. Your remaining funds are registered for payout. They will be transferred to the specified bank account in our next manual payout. You will receive another email once we transferred the funds.",
        payout_sender=None,
        pretix_presale_enabled=False,
        pretix_api_key=None,
        pretix_event=None,
        pretix_organizer=None,
        pretix_shop_url=None,
        pretix_ticket_ids=[],
        pretix_topup_ids=[],
    )


async def test_change_password(user_service: UserService, event_admin_user, event_admin_token: str):
    usr, password = event_admin_user
    with pytest.raises(AccessDenied):  # test with invalid password
        await user_service.change_password(token=event_admin_token, old_password="foobar", new_password="rofl")
    await user_service.change_password(token=event_admin_token, old_password=password, new_password="rofl")

    await user_service.login_user(username=usr.login, password="rofl")


async def test_list_role_assignments_for_user_across_node_tree(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    event_node,
    create_random_user_tag,
):
    user_tag = await create_random_user_tag()
    test_user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"test-user-{secrets.token_hex(16)}",
            display_name="test-user",
            user_tag_uid=user_tag.uid,
            user_tag_pin=user_tag.pin,
        ),
    )

    event_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="event-role",
            event_privileges=[],
            node_privileges=[NodePrivilege.can_book_orders],
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=event_node,
        current_user_id=None,
        user_id=test_user.id,
        role_id=event_role.id,
    )

    subnode = await create_node(
        conn=db_connection,
        parent_id=event_node.id,
        new_node=NewNode(name="assignment-subnode", description=""),
    )
    subnode_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="subnode-role",
            event_privileges=[],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=subnode,
        current_user_id=None,
        user_id=test_user.id,
        role_id=subnode_role.id,
    )

    assignments = await user_service.list_role_assignments_for_user(
        token=event_admin_token,
        node_id=event_node.id,
        user_id=test_user.id,
    )

    assert len(assignments) == 2
    assignments_by_node = {assignment.node_id: assignment for assignment in assignments}
    assert assignments_by_node[event_node.id].node_name == event_node.name
    assert assignments_by_node[event_node.id].role_ids == [event_role.id]
    assert [role.id for role in assignments_by_node[event_node.id].roles] == [event_role.id]
    assert assignments_by_node[subnode.id].node_name == subnode.name
    assert assignments_by_node[subnode.id].role_ids == [subnode_role.id]
    assert [role.id for role in assignments_by_node[subnode.id].roles] == [subnode_role.id]


async def test_list_role_assignments_for_user_not_found(
    user_service: UserService,
    event_admin_token: str,
    event_node,
):
    with pytest.raises(NotFound):
        await user_service.list_role_assignments_for_user(
            token=event_admin_token,
            node_id=event_node.id,
            user_id=999_999_999,
        )


async def test_list_role_assignments_for_user_at_sibling_node_denied(
    db_connection: Connection,
    user_service: UserService,
    event_admin_token: str,
    global_admin_token: str,
    event_node,
    create_random_user_tag,
):
    sibling_event = await create_event(
        conn=db_connection,
        parent_id=ROOT_NODE_ID,
        event=_new_test_event(),
    )

    admin_tag = await create_random_user_tag()
    admin_user = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"test-sibling-admin-{secrets.token_hex(16)}",
            display_name="sibling-admin",
            user_tag_uid=admin_tag.uid,
            user_tag_pin=admin_tag.pin,
        ),
        password="secret",
    )
    admin_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="sibling-admin-role",
            event_privileges=[],
            node_privileges=[NodePrivilege.node_administration],
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=event_node,
        current_user_id=None,
        user_id=admin_user.id,
        role_id=admin_role.id,
    )

    sibling_user = await user_service.create_user_no_auth(
        node_id=sibling_event.id,
        new_user=NewUser(
            login=f"test-sibling-user-{secrets.token_hex(16)}",
            display_name="sibling-user",
        ),
        password="secret",
    )
    sibling_role = await user_service.create_user_role(
        token=global_admin_token,
        node_id=sibling_event.id,
        new_role=NewUserRole(
            name="sibling-user-role",
            event_privileges=[],
            node_privileges=[NodePrivilege.can_book_orders],
        ),
    )
    await associate_user_to_role(
        conn=db_connection,
        node=sibling_event,
        current_user_id=None,
        user_id=sibling_user.id,
        role_id=sibling_role.id,
    )

    login_result = await user_service.login_user(username=admin_user.login, password="secret")
    assert login_result.success is not None
    admin_token = login_result.success.token

    with pytest.raises(NotFound):
        await user_service.list_role_assignments_for_user(
            token=admin_token,
            node_id=event_node.id,
            user_id=sibling_user.id,
        )
