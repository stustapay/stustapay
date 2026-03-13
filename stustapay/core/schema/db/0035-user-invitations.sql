-- migration: 0000035
-- requires: 0000034

-- Add email field to usr table
alter table usr add column email text;

-- Create user_invitation table
create table if not exists user_invitation (
    id bigint primary key generated always as identity,
    user_id bigint not null references usr(id) on delete cascade,
    token text not null unique,
    node_id bigint not null references node(id),
    created_at timestamp not null default now(),
    expires_at timestamp not null default (now() + interval '7 days'),
    accepted_at timestamp,
    created_by bigint references usr(id)
);

-- Create unique constraint: one active invitation per user (accepted_at is null)
create unique index user_invitation_active_user on user_invitation(user_id) where accepted_at is null;

-- Create index on token for fast lookups
create index user_invitation_token on user_invitation(token);

-- Create index on user_id for cleanup queries
create index user_invitation_user_id on user_invitation(user_id);

