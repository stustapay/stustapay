# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,no-value-for-parameter
from stustapay.core.schema.tree import (
    ALL_OBJECT_TYPES,
    ROOT_NODE_ID,
    NewEvent,
    NewNode,
    Node,
)
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.tree.service import TreeService
from stustapay.tests.common import BaseTestCase


class TreeTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.tree_service = TreeService(db_pool=self.db_pool, auth_service=self.auth_service, config=self.test_config)

    async def test_node_creation(self):
        node: Node = await self.tree_service.create_node(
            token=self.admin_token,
            node_id=ROOT_NODE_ID,
            new_node=NewNode(
                name="Test node",
                description="",
                allowed_objects_at_node=ALL_OBJECT_TYPES,
                allowed_objects_in_subtree=ALL_OBJECT_TYPES,
            ),
        )
        self.assertEqual(f"/0/{node.id}", node.path)
        self.assertListEqual([0], node.parent_ids)
        self.assertEqual(0, node.parent)
        self.assertListEqual(ALL_OBJECT_TYPES, node.allowed_objects_in_subtree)
        self.assertListEqual(ALL_OBJECT_TYPES, node.allowed_objects_at_node)
        self.assertListEqual(ALL_OBJECT_TYPES, node.computed_allowed_objects_in_subtree)
        self.assertListEqual(ALL_OBJECT_TYPES, node.computed_allowed_objects_at_node)

        root_node = await fetch_node(conn=self.db_conn, node_id=ROOT_NODE_ID)
        assert root_node is not None

        # the newly created child should appear as a child of the root node
        self.assertTrue(any([node.id == child.id for child in root_node.children]))

    async def test_event_creation(self):
        event_node: Node = await self.tree_service.create_event(
            token=self.admin_token,
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
        self.assertIsNotNone(event_node.event)
        self.assertEqual(f"/0/{event_node.id}", event_node.path)
        self.assertListEqual([0], event_node.parent_ids)
        self.assertEqual(0, event_node.parent)

        child_node: Node = await self.tree_service.create_node(
            token=self.admin_token,
            node_id=event_node.id,
            new_node=NewNode(
                name="Child node",
                description="",
                allowed_objects_at_node=ALL_OBJECT_TYPES,
                allowed_objects_in_subtree=ALL_OBJECT_TYPES,
            ),
        )
        self.assertIsNotNone(child_node)

        with self.assertRaises(Exception):
            await self.tree_service.create_event(
                token=self.admin_token,
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
