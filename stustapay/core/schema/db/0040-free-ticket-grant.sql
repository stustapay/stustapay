-- migration: f3c8a1b2
-- requires: e4d74d33

create table free_ticket_grant (
    id                  bigint primary key generated always as identity,
    event_node_id       bigint      not null references node (id),
    account_id          bigint      not null references account (id),
    conducting_user_id  bigint      not null references usr (id),
    granted_at          timestamptz not null default now()
);

create index on free_ticket_grant (event_node_id, granted_at);
