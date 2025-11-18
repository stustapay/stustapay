-- migration: 0000032
-- requires: 0000031

create table if not exists terminal_device_mapping (
    id serial primary key,
    node_id integer not null references node(id) on delete cascade,
    terminal_id integer not null references terminal(id) on delete cascade,
    headwind_device_id text not null,
    headwind_device_number text,
    headwind_device_name text,
    headwind_device_serial text,
    headwind_device_model text,
    last_synced_at timestamptz,
    last_token_pushed_at timestamptz,
    last_push_status text,
    last_push_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint terminal_device_mapping_terminal_key unique (terminal_id),
    constraint terminal_device_mapping_device_key unique (headwind_device_id)
);

create index if not exists terminal_device_mapping_node_idx on terminal_device_mapping(node_id);

