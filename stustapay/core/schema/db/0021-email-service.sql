-- migration: e2c67010
-- requires: 4e2c75a7

create table if not exists mails (
    id   bigint primary key generated always as identity,
    node_id bigint references node(id) not null,
    subject text not null,
    message text not null,
    html_message boolean not null default false,
    to_addr text not null,
    from_addr text not null,
    send_date timestamp,
    scheduled_send_date timestamp not null default now()
);

create table if not exists mail_attachments (
    id   bigint primary key generated always as identity,
    mail_id bigint references mails(id) on delete cascade not null,
    file_name text not null,
    content bytea not null
);