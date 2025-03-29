-- migration: 546c41ca
-- requires: 395fe4fd

alter table event add column pretix_presale_enabled boolean default false;
alter table event add column pretix_shop_url text;
alter table event add column pretix_api_key text;
alter table event add column pretix_organizer text;
alter table event add column pretix_event text;
alter table event add column pretix_ticket_ids int array;

alter table till_profile add column allow_ticket_vouchers boolean not null default false;

create table ticket_voucher (
    id   bigint primary key generated always as identity,
    node_id bigint not null references node(id),
    created_at timestamptz not null default now(),
    customer_account_id bigint references account(id) not null,

    token text not null unique     -- the printed token
);
