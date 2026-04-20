-- migration: 0000044
-- requires: 0000043

create table if not exists node_sumup_link (
    node_id bigint primary key references node(id) on delete cascade,
    merchant_code text not null,
    merchant_name text,
    refresh_token text not null,
    connected_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
