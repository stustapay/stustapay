# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import csv
from io import StringIO

from stustapay.core.schema.user_tag import NewUserTag
from stustapay.core.schema.user_tag_variant import NewUserTagVariant
from stustapay.core.service.user_tag import UserTagService

from ..core.schema.tree import Node
from .conftest import CreateRandomUserTag


async def test_user_tag_comment_updates(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    user_tag = await create_random_user_tag()

    user_tag_detail = await user_tag_service.get_user_tag_detail(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id
    )
    assert user_tag_detail is not None
    assert user_tag_detail.comment is None

    await user_tag_service.update_user_tag_comment(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id, comment="foobar"
    )
    user_tag_detail = await user_tag_service.get_user_tag_detail(
        token=event_admin_token, node_id=event_node.id, user_tag_id=user_tag.id
    )
    assert user_tag_detail is not None
    assert "foobar" == user_tag_detail.comment


async def test_create_user_tags_with_variants(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
    db_connection,
):
    await user_tag_service.create_user_tag_variant(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_variant=NewUserTagVariant(variant_name="batch-a", description="", priority=0),
    )

    await user_tag_service.create_user_tags(
        token=event_admin_token,
        node_id=event_node.id,
        new_user_tags=[
            NewUserTag(pin="batch-pin-1", secret_id=user_tag_secret, variant_names=["batch-a"]),
            NewUserTag(pin="batch-pin-2", secret_id=user_tag_secret),
            NewUserTag(pin="batch-pin-3", secret_id=user_tag_secret, variant_names=["batch-a"]),
        ],
    )

    detail_with_variant = await user_tag_service.find_user_tags(
        token=event_admin_token, node_id=event_node.id, search_term="batch-pin-1"
    )
    assert len(detail_with_variant) == 1
    assert detail_with_variant[0].variant_names == ["batch-a"]
    assert detail_with_variant[0].activated_at is None

    detail_without_variant = await user_tag_service.find_user_tags(
        token=event_admin_token, node_id=event_node.id, search_term="batch-pin-2"
    )
    assert len(detail_without_variant) == 1
    assert detail_without_variant[0].variant_names == []

    variant_count = await db_connection.fetchval(
        "select count(*) from user_tag_variant where node_id = $1 and variant_name = $2",
        event_node.id,
        "batch-a",
    )
    assert variant_count == 1


async def test_user_tags_csv_export(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
    db_connection,
):
    for variant_name in ("activated-batch", "unactivated-batch"):
        await user_tag_service.create_user_tag_variant(
            token=event_admin_token,
            node_id=event_node.id,
            user_tag_variant=NewUserTagVariant(variant_name=variant_name, description="", priority=0),
        )

    await user_tag_service.create_user_tags(
        token=event_admin_token,
        node_id=event_node.id,
        new_user_tags=[
            NewUserTag(pin="export-pin-activated", secret_id=user_tag_secret, variant_names=["activated-batch"]),
            NewUserTag(pin="export-pin-unactivated", secret_id=user_tag_secret, variant_names=["unactivated-batch"]),
        ],
    )

    await db_connection.execute(
        "update user_tag set uid = $1 where pin = $2 and node_id = $3",
        123456,
        "export-pin-activated",
        event_node.id,
    )

    all_csv = await user_tag_service.get_user_tags_csv(
        token=event_admin_token, node_id=event_node.id, exclude_activated=False, variant_ids=[]
    )
    all_rows = list(csv.DictReader(StringIO(all_csv)))
    exported_pins = {row["pin"]: row["variants"] for row in all_rows if row["pin"].startswith("export-pin-")}
    assert exported_pins == {
        "export-pin-activated": "activated-batch",
        "export-pin-unactivated": "unactivated-batch",
    }

    unactivated_csv = await user_tag_service.get_user_tags_csv(
        token=event_admin_token, node_id=event_node.id, exclude_activated=True, variant_ids=[]
    )
    unactivated_rows = list(csv.DictReader(StringIO(unactivated_csv)))
    unactivated_pins = {row["pin"] for row in unactivated_rows if row["pin"].startswith("export-pin-")}
    assert unactivated_pins == {"export-pin-unactivated"}


async def test_user_tags_csv_export_filters_by_variant(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
):
    variant_a = await user_tag_service.create_user_tag_variant(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_variant=NewUserTagVariant(variant_name="export-filter-a", description="", priority=0),
    )
    variant_b = await user_tag_service.create_user_tag_variant(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_variant=NewUserTagVariant(variant_name="export-filter-b", description="", priority=0),
    )

    await user_tag_service.create_user_tags(
        token=event_admin_token,
        node_id=event_node.id,
        new_user_tags=[
            NewUserTag(pin="export-filter-a-only", secret_id=user_tag_secret, variant_names=["export-filter-a"]),
            NewUserTag(
                pin="export-filter-both",
                secret_id=user_tag_secret,
                variant_names=["export-filter-a", "export-filter-b"],
            ),
            NewUserTag(pin="export-filter-none", secret_id=user_tag_secret),
        ],
    )

    filtered_csv = await user_tag_service.get_user_tags_csv(
        token=event_admin_token, node_id=event_node.id, exclude_activated=False, variant_ids=[variant_a.id]
    )
    filtered_pins = {
        row["pin"] for row in csv.DictReader(StringIO(filtered_csv)) if row["pin"].startswith("export-filter-")
    }
    assert filtered_pins == {"export-filter-a-only", "export-filter-both"}

    multi_filtered_csv = await user_tag_service.get_user_tags_csv(
        token=event_admin_token,
        node_id=event_node.id,
        exclude_activated=False,
        variant_ids=[variant_a.id, variant_b.id],
    )
    multi_filtered_pins = {
        row["pin"] for row in csv.DictReader(StringIO(multi_filtered_csv)) if row["pin"].startswith("export-filter-")
    }
    assert multi_filtered_pins == {"export-filter-a-only", "export-filter-both"}

    both_only_csv = await user_tag_service.get_user_tags_csv(
        token=event_admin_token, node_id=event_node.id, exclude_activated=False, variant_ids=[variant_b.id]
    )
    both_only_pins = {
        row["pin"] for row in csv.DictReader(StringIO(both_only_csv)) if row["pin"].startswith("export-filter-")
    }
    assert both_only_pins == {"export-filter-both"}
