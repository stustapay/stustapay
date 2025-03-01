-- migration: 0e8a849d
-- requires: 706ba453

create type pending_order_type as enum ('topup', 'ticket');
create type pending_order_status as enum ('pending', 'booked', 'cancelled');

create table pending_sumup_order (
    uuid uuid not null unique,
    node_id bigint not null references node(id),
    till_id bigint not null references till(id),
    cashier_id bigint references usr(id),
    last_checked timestamptz,
    check_interval bigint not null default 1, -- interval in seconds
    created_at timestamptz not null default now(),
    order_type pending_order_type not null,
    order_content_version bigint not null,
    order_content json not null,
    status pending_order_status not null default 'pending'
);