import pytest

from stustapay.core.schema.tree import Node
from stustapay.core.schema.user_tag import NewUserTag
from stustapay.core.schema.user_tag_variant import NewUserTagVariant
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.user_tag import UserTagService


async def test_user_tag_variant_crud(user_tag_service: UserTagService, event_node: Node, event_admin_token: str):
    created = await user_tag_service.create_user_tag_variant(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_variant=NewUserTagVariant(variant_name="volunteer", description="Volunteer wristband", priority=5),
    )
    assert created.variant_name == "volunteer"
    assert created.description == "Volunteer wristband"
    assert created.priority == 5

    listed = await user_tag_service.list_user_tag_variants(token=event_admin_token, node_id=event_node.id)
    assert any(user_tag_variant.id == created.id for user_tag_variant in listed)

    updated = await user_tag_service.update_user_tag_variant(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_variant_id=created.id,
        user_tag_variant=NewUserTagVariant(variant_name="volunteer", description="Updated description", priority=10),
    )
    assert updated.description == "Updated description"
    assert updated.priority == 10

    deleted = await user_tag_service.delete_user_tag_variant(
        token=event_admin_token, node_id=event_node.id, user_tag_variant_id=created.id
    )
    assert deleted is True


async def test_create_user_tags_resolves_variant_names(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
):
    user_tag_variant = await user_tag_service.create_user_tag_variant(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_variant=NewUserTagVariant(variant_name="under_16", description="", priority=1),
    )
    await user_tag_service.create_user_tag_variant(
        token=event_admin_token,
        node_id=event_node.id,
        user_tag_variant=NewUserTagVariant(variant_name="vip", description="", priority=0),
    )

    await user_tag_service.create_user_tags(
        token=event_admin_token,
        node_id=event_node.id,
        new_user_tags=[
            NewUserTag(pin="abc123", secret_id=user_tag_secret, variant_names=["under_16"]),
            NewUserTag(pin="def456", secret_id=user_tag_secret, variant_ids=[user_tag_variant.id]),
            NewUserTag(
                pin="ghi789",
                secret_id=user_tag_secret,
                variant_names=["under_16", "vip"],
            ),
        ],
    )

    tags = await user_tag_service.find_user_tags(token=event_admin_token, node_id=event_node.id, search_term="abc")
    assert len(tags) == 1
    assert tags[0].variant_ids == [user_tag_variant.id]
    assert tags[0].variant_names == ["under_16"]

    tags_by_id = await user_tag_service.find_user_tags(
        token=event_admin_token, node_id=event_node.id, search_term="def456"
    )
    assert len(tags_by_id) == 1
    assert tags_by_id[0].variant_ids == [user_tag_variant.id]

    multi_variant_tags = await user_tag_service.find_user_tags(
        token=event_admin_token, node_id=event_node.id, search_term="ghi"
    )
    assert len(multi_variant_tags) == 1
    assert sorted(multi_variant_tags[0].variant_names) == ["under_16", "vip"]


async def test_create_user_tags_unknown_variant_name_raises(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
):
    with pytest.raises(InvalidArgument, match="Unknown user tag variant name"):
        await user_tag_service.create_user_tags(
            token=event_admin_token,
            node_id=event_node.id,
            new_user_tags=[NewUserTag(pin="xyz789", secret_id=user_tag_secret, variant_names=["does_not_exist"])],
        )


async def test_create_user_tags_unknown_variant_id_raises(
    user_tag_service: UserTagService,
    event_node: Node,
    event_admin_token: str,
    user_tag_secret: int,
):
    with pytest.raises(InvalidArgument, match="Unknown user tag variant id"):
        await user_tag_service.create_user_tags(
            token=event_admin_token,
            node_id=event_node.id,
            new_user_tags=[NewUserTag(pin="xyz789", secret_id=user_tag_secret, variant_ids=[999999])],
        )
