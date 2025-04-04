# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,no-value-for-parameter
import pytest
from asyncpg import RaiseError
from sftkit.database import Connection

from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, NewNode, Node, ObjectType
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.tree.service import TreeService
from stustapay.tests.common import list_equals


async def test_node_creation(db_connection: Connection, tree_service: TreeService, global_admin_token: str):
    node: Node = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(
            name="Test node",
            description="",
        ),
    )
    assert f"/0/{node.id}" == node.path
    assert list_equals([ROOT_NODE_ID], node.parent_ids)
    assert ROOT_NODE_ID == node.parent

    root_node = await fetch_node(conn=db_connection, node_id=ROOT_NODE_ID)
    assert root_node is not None

    # the newly created child should appear as a child of the root node
    assert any([node.id == child.id for child in root_node.children])

    # we should not be able to add a second node with the same name under the newly created one
    with pytest.raises(RaiseError):
        await tree_service.create_node(
            token=global_admin_token,
            node_id=node.id,
            new_node=NewNode(
                name="Test node",
                description="",
            ),
        )


async def test_event_creation(tree_service: TreeService, global_admin_token: str):
    event_node: Node = await tree_service.create_event(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        event=NewEvent(
            name="Test event",
            description="",
            currency_identifier="EUR",
            sumup_topup_enabled=False,
            sumup_payment_enabled=False,
            max_account_balance=100,
            customer_portal_url="https://pay.stustapay.de",
            customer_portal_about_page_url="https://pay.stustapay.de/about",
            customer_portal_data_privacy_url="https://pay.stustapay.de/privacy",
            customer_portal_contact_email="test@test.com",
            ust_id="UST ID",
            bon_issuer="Issuer",
            bon_address="Address",
            bon_title="Title",
            sepa_enabled=False,
            sepa_description="",
            sepa_sender_iban="",
            sepa_allowed_country_codes=[],
            sepa_sender_name="",
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
        ),
    )
    assert event_node.event is not None
    assert f"/0/{event_node.id}" == event_node.path
    assert list_equals([0], event_node.parent_ids)
    assert 0 == event_node.parent

    child_node: Node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(
            name="Child node",
            description="",
        ),
    )
    assert child_node is not None

    with pytest.raises(Exception):
        await tree_service.create_event(
            token=global_admin_token,
            node_id=child_node.id,
            event=NewEvent(
                name="Invalid Node",
                description="",
                currency_identifier="EUR",
                sumup_topup_enabled=False,
                sumup_payment_enabled=False,
                max_account_balance=100,
                customer_portal_url="https://pay.stustapay.de",
                customer_portal_about_page_url="https://pay.stustapay.de/about",
                customer_portal_data_privacy_url="https://pay.stustapay.de/privacy",
                customer_portal_contact_email="test@test.com",
                ust_id="UST ID",
                bon_issuer="Issuer",
                bon_address="Address",
                bon_title="Title",
                sepa_enabled=False,
                sepa_description="",
                sepa_sender_iban="",
                sepa_allowed_country_codes=[],
                sepa_sender_name="",
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
            ),
        )


async def test_object_rules(tree_service: TreeService, global_admin_token: str):
    top_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(
            name="foobar",
            description="",
        ),
    )
    assert len(top_node.forbidden_objects_at_node) == 0
    assert len(top_node.forbidden_objects_in_subtree) == 0
    assert list_equals(
        [
            ObjectType.ticket,
            ObjectType.product,
            ObjectType.till,
            ObjectType.user_tag,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.terminal,
        ],
        top_node.computed_forbidden_objects_at_node,
    )
    assert len(top_node.computed_forbidden_objects_in_subtree) == 0
    event_node = await tree_service.create_event(
        token=global_admin_token,
        node_id=top_node.id,
        event=NewEvent(
            name="Test event",
            description="",
            currency_identifier="EUR",
            sumup_topup_enabled=False,
            sumup_payment_enabled=False,
            max_account_balance=100,
            customer_portal_url="https://pay.stustapay.de",
            customer_portal_about_page_url="https://pay.stustapay.de/about",
            customer_portal_data_privacy_url="https://pay.stustapay.de/privacy",
            customer_portal_contact_email="test@test.com",
            ust_id="UST ID",
            bon_issuer="Issuer",
            bon_address="Address",
            bon_title="Title",
            sepa_enabled=False,
            sepa_description="",
            sepa_sender_iban="",
            sepa_allowed_country_codes=[],
            sepa_sender_name="",
            forbidden_objects_in_subtree=[ObjectType.ticket],
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
        ),
    )
    assert len(event_node.forbidden_objects_at_node) == 0
    assert list_equals([ObjectType.ticket], event_node.forbidden_objects_in_subtree)
    assert len(event_node.computed_forbidden_objects_at_node) == 0
    assert list_equals(
        [
            ObjectType.ticket,
            ObjectType.tse,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.user_tag,
            ObjectType.user_role,
            ObjectType.user,
        ],
        event_node.computed_forbidden_objects_in_subtree,
    )

    sub_node = await tree_service.create_node(
        token=global_admin_token,
        node_id=event_node.id,
        new_node=NewNode(
            name="sub-node",
            description="",
            forbidden_objects_at_node=[ObjectType.till],
            forbidden_objects_in_subtree=[ObjectType.product],
        ),
    )
    assert list_equals([ObjectType.till], sub_node.forbidden_objects_at_node)
    assert list_equals([ObjectType.product], sub_node.forbidden_objects_in_subtree)
    assert list_equals(
        [
            ObjectType.till,
            ObjectType.ticket,
            ObjectType.tse,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.user_tag,
            ObjectType.user_role,
            ObjectType.user,
        ],
        sub_node.computed_forbidden_objects_at_node,
    )
    assert list_equals(
        [
            ObjectType.product,
            ObjectType.ticket,
            ObjectType.tse,
            ObjectType.tax_rate,
            ObjectType.account,
            ObjectType.user_tag,
            ObjectType.user_role,
            ObjectType.user,
        ],
        sub_node.computed_forbidden_objects_in_subtree,
    )
