-- migration: 0000034
-- requires: 0000033

create table if not exists entry_area (
    id bigint primary key generated always as identity,
    node_id bigint not null references node(id) on delete cascade,
    name text not null,
    description text
);

create table if not exists entry_group (
    id bigint primary key generated always as identity,
    node_id bigint not null references node(id) on delete cascade,
    name text not null,
    description text
);

create table if not exists entry_area_group (
    id bigint primary key generated always as identity,
    area_id bigint not null references entry_area(id) on delete cascade,
    group_id bigint not null references entry_group(id) on delete cascade,
    unique(area_id, group_id)
);

create table if not exists entry_area_group_window (
    id bigint primary key generated always as identity,
    area_group_id bigint not null references entry_area_group(id) on delete cascade,
    start_at timestamptz not null,
    end_at timestamptz not null,
    check (start_at < end_at)
);

create table if not exists entry_group_user_tag (
    group_id bigint not null references entry_group(id) on delete cascade,
    user_tag_id bigint not null references user_tag(id) on delete cascade,
    added_at timestamptz not null default now(),
    primary key (group_id, user_tag_id)
);

create table if not exists entry_presence (
    area_id bigint not null references entry_area(id) on delete cascade,
    user_tag_id bigint not null references user_tag(id) on delete cascade,
    is_inside bool not null default false,
    last_entry_at timestamptz,
    last_exit_at timestamptz,
    primary key (area_id, user_tag_id)
);

create table if not exists entry_scan_log (
    id bigint primary key generated always as identity,
    node_id bigint not null references node(id) on delete cascade,
    terminal_id bigint not null references terminal(id) on delete cascade,
    area_id bigint not null references entry_area(id) on delete cascade,
    direction text not null,
    user_tag_id bigint references user_tag(id) on delete set null,
    user_tag_uid numeric(20) not null,
    allowed bool not null,
    reason text not null,
    area_group_id bigint references entry_area_group(id) on delete set null,
    scanned_at timestamptz not null default now()
);

create index if not exists entry_area_node_idx on entry_area(node_id);
create index if not exists entry_group_node_idx on entry_group(node_id);
create index if not exists entry_area_group_area_idx on entry_area_group(area_id);
create index if not exists entry_area_group_group_idx on entry_area_group(group_id);
create index if not exists entry_area_group_window_area_group_idx on entry_area_group_window(area_group_id);
create index if not exists entry_group_user_tag_user_idx on entry_group_user_tag(user_tag_id);
create index if not exists entry_presence_area_idx on entry_presence(area_id);
create index if not exists entry_scan_log_node_idx on entry_scan_log(node_id);
create index if not exists entry_scan_log_area_idx on entry_scan_log(area_id);
create index if not exists entry_scan_log_scanned_at_idx on entry_scan_log(scanned_at);
create index if not exists entry_scan_log_user_tag_uid_idx on entry_scan_log(user_tag_uid);

alter table terminal add column mode text not null default 'till';
alter table terminal add column entry_area_id bigint references entry_area(id);
alter table terminal add constraint terminal_mode_check check (mode in ('till', 'entry', 'exit'));
alter table terminal add constraint terminal_entry_area_check check (
    (mode = 'till' and entry_area_id is null) or (mode <> 'till' and entry_area_id is not null)
);

insert into tree_object_type (name)
values ('entry_area'), ('entry_group')
on conflict do nothing;
