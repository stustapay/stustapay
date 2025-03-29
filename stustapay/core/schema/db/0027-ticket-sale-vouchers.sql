-- migration: b97a1f65
-- requires: 395fe4fd

-- pre-sale ticket vouchers successfully bought by a user.
-- can be scanned for a UserTagScan during ticket sales as a value-voucher.


create table ticket_voucher (
    id   bigint primary key generated always as identity,
    node_id bigint not null references node(id),
    created_at timestamptz not null default now(),
    customer_account_id bigint references account(id) not null,

    -- TODO: should be signed, and be unique together with ticket_shop
    token text not null unique     -- the printed token
);
