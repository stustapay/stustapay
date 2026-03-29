from datetime import datetime, timedelta, timezone

from stustapay.core.schema.entry import (
    EntryAreaGroupAssignPayload,
    EntryGroupMemberAddByGroupTagPayload,
    EntryGroupMemberAddPayload,
    EntryScanLogQuery,
    NewEntryArea,
    NewEntryAreaGroupWindow,
    NewEntryGroup,
)
from stustapay.core.schema.terminal import NewTerminal, TerminalMode
from stustapay.core.schema.tree import NewNode, Node
from stustapay.core.service.entry import EntryService
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.tree.service import TreeService
from stustapay.core.service.user_tag import UserTagService
from stustapay.tests.conftest import CreateRandomUserTag


async def test_entry_scan_flow(
    entry_service: EntryService,
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    area = await entry_service.create_entry_area(
        token=event_admin_token,
        node_id=event_node.id,
        area=NewEntryArea(name="Main Entry", description="Gate A"),
    )
    group = await entry_service.create_entry_group(
        token=event_admin_token,
        node_id=event_node.id,
        group=NewEntryGroup(name="Crew", description="Crew access"),
    )
    await entry_service.assign_entry_group_to_area(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        payload=EntryAreaGroupAssignPayload(group_id=group.id),
    )

    now = datetime.now(timezone.utc)
    await entry_service.create_entry_area_group_window(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        group_id=group.id,
        window=NewEntryAreaGroupWindow(start_at=now - timedelta(minutes=5), end_at=now + timedelta(minutes=5)),
    )

    allowed_tag = await create_random_user_tag()
    await entry_service.add_entry_group_member(
        token=event_admin_token,
        node_id=event_node.id,
        group_id=group.id,
        payload=EntryGroupMemberAddPayload(user_tag_uid=allowed_tag.uid),
    )

    entry_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Entry Gate",
            description="Entry scanner",
            mode=TerminalMode.entry,
            entry_area_id=area.id,
        ),
    )
    exit_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Exit Gate",
            description="Exit scanner",
            mode=TerminalMode.exit,
            entry_area_id=area.id,
        ),
    )

    entry_token = (await terminal_service.register_terminal(registration_uuid=entry_terminal.registration_uuid)).token
    exit_token = (await terminal_service.register_terminal(registration_uuid=exit_terminal.registration_uuid)).token

    allowed_entry = await entry_service.scan_entry(token=entry_token, tag_uid=allowed_tag.uid)
    assert allowed_entry.allowed is True
    assert allowed_entry.is_inside is True

    denied_repeat = await entry_service.scan_entry(token=entry_token, tag_uid=allowed_tag.uid)
    assert denied_repeat.allowed is False
    assert denied_repeat.reason == "already_inside"

    allowed_exit = await entry_service.scan_entry(token=exit_token, tag_uid=allowed_tag.uid)
    assert allowed_exit.allowed is True
    assert allowed_exit.is_inside is False

    allowed_entry_again = await entry_service.scan_entry(token=entry_token, tag_uid=allowed_tag.uid)
    assert allowed_entry_again.allowed is True
    assert allowed_entry_again.is_inside is True

    other_tag = await create_random_user_tag()
    denied_other = await entry_service.scan_entry(token=entry_token, tag_uid=other_tag.uid)
    assert denied_other.allowed is False
    assert denied_other.reason == "not_in_group"


async def test_parent_terminal_can_use_child_entry_area(
    entry_service: EntryService,
    terminal_service: TerminalService,
    tree_service: TreeService,
    event_admin_token: str,
    event_node: Node,
):
    child_node = await tree_service.create_node(
        token=event_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Entry Sub Event", description=""),
    )
    area = await entry_service.create_entry_area(
        token=event_admin_token,
        node_id=child_node.id,
        area=NewEntryArea(name="Child Entry", description="Gate B"),
    )

    terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Shared Entry Terminal",
            description="Shared scanner",
            mode=TerminalMode.entry,
            entry_area_id=area.id,
        ),
    )

    registration = await terminal_service.register_terminal(registration_uuid=str(terminal.registration_uuid))
    config = await terminal_service.get_terminal_config(token=registration.token)

    assert config.entry_area is not None
    assert config.entry_area.id == area.id
    assert config.entry_area.name == area.name


async def test_add_entry_group_members_by_group_tag(
    entry_service: EntryService,
    user_tag_service: UserTagService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    group = await entry_service.create_entry_group(
        token=event_admin_token,
        node_id=event_node.id,
        group=NewEntryGroup(name="Crew", description="Crew access"),
    )

    crew_tag_one = await create_random_user_tag()
    crew_tag_two = await create_random_user_tag()
    other_tag = await create_random_user_tag()

    await user_tag_service.update_user_tag_group_tag(
        token=event_admin_token, node_id=event_node.id, user_tag_id=crew_tag_one.id, group_tag="crew"
    )
    await user_tag_service.update_user_tag_group_tag(
        token=event_admin_token, node_id=event_node.id, user_tag_id=crew_tag_two.id, group_tag="crew"
    )
    await user_tag_service.update_user_tag_group_tag(
        token=event_admin_token, node_id=event_node.id, user_tag_id=other_tag.id, group_tag="staff"
    )

    members = await entry_service.add_entry_group_members_by_group_tag(
        token=event_admin_token,
        node_id=event_node.id,
        group_id=group.id,
        payload=EntryGroupMemberAddByGroupTagPayload(group_tag="crew"),
    )
    assert {member.user_tag_id for member in members} == {crew_tag_one.id, crew_tag_two.id}

    all_members = await entry_service.list_entry_group_members(
        token=event_admin_token, node_id=event_node.id, group_id=group.id
    )
    assert {member.user_tag_id for member in all_members} == {crew_tag_one.id, crew_tag_two.id}


async def test_entry_scan_allows_any_matching_group_window(
    entry_service: EntryService,
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    area = await entry_service.create_entry_area(
        token=event_admin_token,
        node_id=event_node.id,
        area=NewEntryArea(name="Main Entry", description="Gate A"),
    )
    group_early = await entry_service.create_entry_group(
        token=event_admin_token,
        node_id=event_node.id,
        group=NewEntryGroup(name="Early", description="Early access"),
    )
    group_late = await entry_service.create_entry_group(
        token=event_admin_token,
        node_id=event_node.id,
        group=NewEntryGroup(name="Late", description="Late access"),
    )
    await entry_service.assign_entry_group_to_area(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        payload=EntryAreaGroupAssignPayload(group_id=group_early.id),
    )
    await entry_service.assign_entry_group_to_area(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        payload=EntryAreaGroupAssignPayload(group_id=group_late.id),
    )

    now = datetime.now(timezone.utc)
    await entry_service.create_entry_area_group_window(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        group_id=group_early.id,
        window=NewEntryAreaGroupWindow(start_at=now - timedelta(minutes=30), end_at=now - timedelta(minutes=20)),
    )
    await entry_service.create_entry_area_group_window(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        group_id=group_late.id,
        window=NewEntryAreaGroupWindow(start_at=now - timedelta(minutes=5), end_at=now + timedelta(minutes=5)),
    )

    tag = await create_random_user_tag()
    await entry_service.add_entry_group_member(
        token=event_admin_token,
        node_id=event_node.id,
        group_id=group_early.id,
        payload=EntryGroupMemberAddPayload(user_tag_uid=tag.uid),
    )
    await entry_service.add_entry_group_member(
        token=event_admin_token,
        node_id=event_node.id,
        group_id=group_late.id,
        payload=EntryGroupMemberAddPayload(user_tag_uid=tag.uid),
    )

    entry_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Entry Gate",
            description="Entry scanner",
            mode=TerminalMode.entry,
            entry_area_id=area.id,
        ),
    )
    entry_token = (await terminal_service.register_terminal(registration_uuid=entry_terminal.registration_uuid)).token

    result = await entry_service.scan_entry(token=entry_token, tag_uid=tag.uid)
    assert result.allowed is True
    assert result.group_id == group_late.id
    assert result.group_name == group_late.name


async def test_entry_scan_denied_outside_window(
    entry_service: EntryService,
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    area = await entry_service.create_entry_area(
        token=event_admin_token,
        node_id=event_node.id,
        area=NewEntryArea(name="Main Entry", description="Gate A"),
    )
    group = await entry_service.create_entry_group(
        token=event_admin_token,
        node_id=event_node.id,
        group=NewEntryGroup(name="Crew", description="Crew access"),
    )
    await entry_service.assign_entry_group_to_area(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        payload=EntryAreaGroupAssignPayload(group_id=group.id),
    )

    now = datetime.now(timezone.utc)
    await entry_service.create_entry_area_group_window(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        group_id=group.id,
        window=NewEntryAreaGroupWindow(start_at=now + timedelta(minutes=5), end_at=now + timedelta(minutes=15)),
    )

    tag = await create_random_user_tag()
    await entry_service.add_entry_group_member(
        token=event_admin_token,
        node_id=event_node.id,
        group_id=group.id,
        payload=EntryGroupMemberAddPayload(user_tag_uid=tag.uid),
    )

    entry_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Entry Gate",
            description="Entry scanner",
            mode=TerminalMode.entry,
            entry_area_id=area.id,
        ),
    )
    entry_token = (await terminal_service.register_terminal(registration_uuid=entry_terminal.registration_uuid)).token

    result = await entry_service.scan_entry(token=entry_token, tag_uid=tag.uid)
    assert result.allowed is False
    assert result.reason == "outside_window"
    assert result.is_inside is False


async def test_entry_scan_exit_requires_presence(
    entry_service: EntryService,
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    area = await entry_service.create_entry_area(
        token=event_admin_token,
        node_id=event_node.id,
        area=NewEntryArea(name="Exit Gate", description="Exit only"),
    )

    tag = await create_random_user_tag()

    exit_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Exit Gate",
            description="Exit scanner",
            mode=TerminalMode.exit,
            entry_area_id=area.id,
        ),
    )
    exit_token = (await terminal_service.register_terminal(registration_uuid=exit_terminal.registration_uuid)).token

    result = await entry_service.scan_entry(token=exit_token, tag_uid=tag.uid)
    assert result.allowed is False
    assert result.reason == "not_inside"
    assert result.is_inside is False


async def test_entry_scan_logs_include_denied(
    entry_service: EntryService,
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    create_random_user_tag: CreateRandomUserTag,
):
    area = await entry_service.create_entry_area(
        token=event_admin_token,
        node_id=event_node.id,
        area=NewEntryArea(name="Main Entry", description="Gate A"),
    )
    group = await entry_service.create_entry_group(
        token=event_admin_token,
        node_id=event_node.id,
        group=NewEntryGroup(name="Crew", description="Crew access"),
    )
    await entry_service.assign_entry_group_to_area(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        payload=EntryAreaGroupAssignPayload(group_id=group.id),
    )

    now = datetime.now(timezone.utc)
    await entry_service.create_entry_area_group_window(
        token=event_admin_token,
        node_id=event_node.id,
        area_id=area.id,
        group_id=group.id,
        window=NewEntryAreaGroupWindow(start_at=now - timedelta(minutes=5), end_at=now + timedelta(minutes=5)),
    )

    tag = await create_random_user_tag()
    await entry_service.add_entry_group_member(
        token=event_admin_token,
        node_id=event_node.id,
        group_id=group.id,
        payload=EntryGroupMemberAddPayload(user_tag_uid=tag.uid),
    )

    entry_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Entry Gate",
            description="Entry scanner",
            mode=TerminalMode.entry,
            entry_area_id=area.id,
        ),
    )
    entry_token = (await terminal_service.register_terminal(registration_uuid=entry_terminal.registration_uuid)).token

    allowed = await entry_service.scan_entry(token=entry_token, tag_uid=tag.uid)
    assert allowed.allowed is True

    denied = await entry_service.scan_entry(token=entry_token, tag_uid=tag.uid)
    assert denied.allowed is False
    assert denied.reason == "already_inside"

    logs = await entry_service.list_entry_scan_logs(
        token=event_admin_token,
        node_id=event_node.id,
        query=EntryScanLogQuery(user_tag_uid=tag.uid),
    )
    assert len(logs) == 2
    assert {log.reason for log in logs} == {"allowed", "already_inside"}
