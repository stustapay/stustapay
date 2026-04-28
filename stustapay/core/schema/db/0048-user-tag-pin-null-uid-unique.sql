-- migration: 0000048
-- requires: 0000047

-- Allow the same printed PIN on multiple tags (distinct UIDs) while keeping at most
-- one pre-activated row per PIN (uid is null) in the node tree. UID uniqueness is unchanged.

create or replace function check_user_tag_pin_null_uid_unique_in_tree(
    element_id bigint,
    pin_value text,
    node_id bigint
) returns boolean as
$$
<<locals>> declare
    node_parent_ids     bigint[];
    node_path           text;
    node_name           text;

    existing_id         bigint;
    existing_node_name  text;
begin
    select n.parent_ids, n.path, n.name into locals.node_parent_ids, locals.node_path, locals.node_name
    from node n
    where n.id = check_user_tag_pin_null_uid_unique_in_tree.node_id;

    if check_user_tag_pin_null_uid_unique_in_tree.pin_value is null then
        return true;
    end if;

    select tab.id
    from user_tag tab
        join node n on n.id = tab.node_id
    where tab.pin = check_user_tag_pin_null_uid_unique_in_tree.pin_value
      and tab.uid is null
      and tab.id != check_user_tag_pin_null_uid_unique_in_tree.element_id
      and (
          n.id = check_user_tag_pin_null_uid_unique_in_tree.node_id
          or n.id = any(locals.node_parent_ids)
          or n.path like locals.node_path || '/%'
      )
    limit 1
    into locals.existing_id;

    if locals.existing_id is not null then
        execute format(
            'select n.name from node n join user_tag tab on n.id = tab.node_id where tab.id = %L::bigint',
            locals.existing_id
        )
        into locals.existing_node_name;
        raise 'pin with value "%" and null uid is not unique at node % : %, the same exists already at node %',
            check_user_tag_pin_null_uid_unique_in_tree.pin_value,
            locals.node_name,
            check_user_tag_pin_null_uid_unique_in_tree.node_id,
            locals.existing_node_name;
    end if;

    return true;
end
$$ language plpgsql
    set search_path = "$user", public;

alter table user_tag drop constraint if exists pin_is_unique;

alter table user_tag drop constraint if exists pin_null_uid_unique_in_tree;
alter table user_tag add constraint pin_null_uid_unique_in_tree check (
    uid is not null or check_user_tag_pin_null_uid_unique_in_tree(id, pin, node_id)
);
