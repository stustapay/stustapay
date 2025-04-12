-- migration: 1798370e
-- requires: e517a853

alter table terminal add column last_seen timestamptz not null default now();

create table audit_log (
    id bigint primary key generated always as identity,
    created_at timestamptz not null default now(),
    node_id bigint not null references node(id),
    log_type text not null,
    originating_user_id bigint references usr(id),
    originating_terminal_id bigint references terminal(id),
    content jsonb not null
);
