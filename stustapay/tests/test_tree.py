# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,no-value-for-parameter
import pytest

from stustapay.core.schema.tree import (
    ALL_OBJECT_TYPES,
    ROOT_NODE_ID,
    NewEvent,
    NewNode,
    Node,
)
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.tree.service import TreeService
from stustapay.framework.database import Connection
from stustapay.tests.common import list_equals


async def test_node_creation(db_connection: Connection, tree_service: TreeService, admin_token: str):
    node: Node = await tree_service.create_node(
        token=admin_token,
        node_id=ROOT_NODE_ID,
        new_node=NewNode(
            name="Test node",
            description="",
            allowed_objects_at_node=ALL_OBJECT_TYPES,
            allowed_objects_in_subtree=ALL_OBJECT_TYPES,
        ),
    )
    assert f"/0/{node.id}" == node.path
    assert list_equals([0], node.parent_ids)
    assert 0 == node.parent
    assert list_equals(ALL_OBJECT_TYPES, node.allowed_objects_in_subtree)
    assert list_equals(ALL_OBJECT_TYPES, node.allowed_objects_at_node)
    assert list_equals(ALL_OBJECT_TYPES, node.computed_allowed_objects_in_subtree)
    assert list_equals(ALL_OBJECT_TYPES, node.computed_allowed_objects_at_node)

    root_node = await fetch_node(conn=db_connection, node_id=ROOT_NODE_ID)
    assert root_node is not None

    # the newly created child should appear as a child of the root node
    assert any([node.id == child.id for child in root_node.children])


async def test_event_creation(tree_service: TreeService, admin_token: str):
    event_node: Node = await tree_service.create_event(
        token=admin_token,
        node_id=ROOT_NODE_ID,
        event=NewEvent(
            name="Test event",
            description="",
            allowed_objects_at_node=ALL_OBJECT_TYPES,
            allowed_objects_in_subtree=ALL_OBJECT_TYPES,
            currency_identifier="EUR",
            sumup_topup_enabled=False,
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
        ),
    )
    assert event_node.event is not None
    assert f"/0/{event_node.id}" == event_node.path
    assert list_equals([0], event_node.parent_ids)
    assert 0 == event_node.parent

    child_node: Node = await tree_service.create_node(
        token=admin_token,
        node_id=event_node.id,
        new_node=NewNode(
            name="Child node",
            description="",
            allowed_objects_at_node=ALL_OBJECT_TYPES,
            allowed_objects_in_subtree=ALL_OBJECT_TYPES,
        ),
    )
    assert child_node is not None

    with pytest.raises(Exception):
        await tree_service.create_event(
            token=admin_token,
            node_id=child_node.id,
            event=NewEvent(
                name="Invalid Node",
                description="",
                allowed_objects_at_node=ALL_OBJECT_TYPES,
                allowed_objects_in_subtree=ALL_OBJECT_TYPES,
                currency_identifier="EUR",
                sumup_topup_enabled=False,
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
            ),
        )
