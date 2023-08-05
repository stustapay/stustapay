-- revision: c66cbafc
-- requires: 2a15b453

-- this migration introduces tree structures for all records


-- return the id-array of a given node id's path,
-- i.e. trace it up to the root.
create or replace function node_trace(
    start_node_id bigint
) returns bigint[] as
$$
<<locals>> declare
    has_cycle boolean;
    trace bigint[];
begin

    -- now for the juicy part - check if we have circular dependencies in clearing account relations
    with recursive search_graph(node_id, depth, path, cycle) as (
        -- base case: start at the requested node
        select node.id, 1, array[node.id], false
        from node
        where node.id = start_node_id

        union all

        -- add the node's parent to our result set (find the parents for all so-far evaluated nodes)
        select node.parent, sg.depth + 1, node.parent || sg.path, node.parent = any(sg.path)
        from search_graph sg
            join node on sg.node_id = node.id
        where node.id != 0 and not sg.cycle
    )
    select sg.path, sg.cycle into locals.trace, locals.has_cycle
    from search_graph sg
    where node_id = 0;

    if locals.has_cycle then
        raise 'node has cycle: %', locals.trace;
    end if;

    return locals.trace;
end
$$ language plpgsql
    stable
    security invoker;

-- one tree node, references exactly one parent
create table if not exists node (
    id bigint primary key generated always as identity (start with 1000),
    parent bigint not null references node(id),

    name text not null,
    description text not null default '',
    path text not null generated always as (array_to_string(node_trace(id), '/')) stored,
    parent_ids bigint[] not null generated always as (node_trace(id)) stored,

    constraint name_is_unicode_nfc check (name IS NFC normalized),
    constraint name_no_slash check (strpos(name, '/') = 0),
    constraint selfreference_only_root check (
        -- only the root may reference itself as tree termination
        (parent = id) = (id = 0)
    )
);

create index on node (parent);


-- create default nodes
insert into node (
    id, parent, name
) overriding system value
values
    (0, 0, ''),
    (1, 0, 'event')
    on conflict do nothing;


-- add the node column to all elements in the tree, and reference the 'event' node.
alter table account add column node bigint not null references node(id) default 1;
alter table account alter column node drop default;

alter table bon add column node bigint not null references node(id) default 1;
alter table bon alter column node drop default;

alter table cash_register add column node bigint not null references node(id) default 1;
alter table cash_register alter column node drop default;

alter table cash_register_stocking add column node bigint not null references node(id) default 1;
alter table cash_register_stocking alter column node drop default;

alter table cashier_shift add column node bigint not null references node(id) default 1;
alter table cashier_shift alter column node drop default;

alter table config add column node bigint not null references node(id) default 1;
alter table config alter column node drop default;

alter table customer_info add column node bigint not null references node(id) default 1;
alter table customer_info alter column node drop default;

alter table payout_run add column node bigint not null references node(id) default 1;
alter table payout_run alter column node drop default;

alter table product add column node bigint not null references node(id) default 1;
alter table product alter column node drop default;

alter table restriction_type add column node bigint not null references node(id) default 1;
alter table restriction_type alter column node drop default;

alter table tax add column node bigint not null references node(id) default 1;
alter table tax alter column node drop default;

alter table ticket add column node bigint not null references node(id) default 1;
alter table ticket alter column node drop default;

alter table till add column node bigint not null references node(id) default 1;
alter table till alter column node drop default;

alter table till_button add column node bigint not null references node(id) default 1;
alter table till_button alter column node drop default;

alter table till_layout add column node bigint not null references node(id) default 1;
alter table till_layout alter column node drop default;

alter table till_profile add column node bigint not null references node(id) default 1;
alter table till_profile alter column node drop default;

alter table tse add column node bigint not null references node(id) default 1;
alter table tse alter column node drop default;

alter table user_role add column node bigint not null references node(id) default 1;
alter table user_role alter column node drop default;

alter table user_tag add column node bigint not null references node(id) default 1;
alter table user_tag alter column node drop default;

alter table user_tag_secret add column node bigint not null references node(id) default 1;
alter table user_tag_secret alter column node drop default;

alter table usr add column node bigint not null references node(id) default 1;
alter table usr alter column node drop default;

-- TODO assign the associated event node to: ordr, transaction, line_item
-- TODO store the next id for orders in an event to increment them continuously
