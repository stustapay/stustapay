-- migration: e517a853
-- requires: 546c41ca

create table blob (
    id uuid primary key default gen_random_uuid(),
    data bytea not null,
    mime_type text not null
);

create table event_design (
    node_id bigint not null references node(id) unique,
    bon_logo_blob_id uuid references blob(id)
);
