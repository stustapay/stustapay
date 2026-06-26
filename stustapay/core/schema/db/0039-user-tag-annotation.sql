-- migration: e4d74d33
-- requires: a55734c9

create table user_tag_variant (
    id            bigint primary key generated always as identity,
    event_node_id bigint not null references node (id),
    variant_name  text   not null,
    unique (event_node_id, variant_name)
);

alter table user_tag
    add column variant_id bigint references user_tag_variant (id);
