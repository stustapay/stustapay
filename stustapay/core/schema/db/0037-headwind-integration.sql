-- migration: fb101fcb
-- requires: a1b2c3d4

alter table event
    add column headwind_enabled boolean not null default false,
    add column headwind_url text,
    add column headwind_username text,
    add column headwind_password text;

create type mdm_type as enum ('headwind');

create table if not exists terminal_mdm_device_mapping (
    terminal_id integer not null primary key references terminal (id) on delete cascade,
    type mdm_type not null,

    -- unique identifier in MDM
    mdm_device_id text not null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint terminal_mdm_device_mapping_device_key unique (mdm_device_id)
);
