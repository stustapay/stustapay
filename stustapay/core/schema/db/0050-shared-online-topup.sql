-- migration: 0000050
-- requires: 0000049

create table shared_topup_link (
    id bigint primary key generated always as identity,
    customer_account_id bigint not null references account(id) on delete cascade,
    token_hash text not null unique,
    created_at timestamptz not null default now(),
    expires_at timestamptz,
    revoked_at timestamptz,
    label text
);

create index shared_topup_link_customer_account_id_idx on shared_topup_link (customer_account_id);

create table shared_topup_order (
    order_uuid uuid primary key references pending_sumup_order(uuid) on delete cascade,
    link_id bigint references shared_topup_link(id) on delete set null,
    customer_account_id bigint not null references account(id) on delete cascade,
    contributor_name text not null,
    created_at timestamptz not null default now(),
    constraint shared_topup_order_contributor_name_not_empty check (length(trim(contributor_name)) > 0),
    constraint shared_topup_order_contributor_name_max_length check (length(contributor_name) <= 80)
);

create index shared_topup_order_customer_account_id_idx on shared_topup_order (customer_account_id);
