-- book a new transaction and update the account balances automatically, returns the new transaction_id
create or replace function book_transaction(
    order_id bigint,
    description text,
    source_account_id bigint,
    target_account_id bigint,
    amount numeric,
    vouchers_amount bigint,
    booked_at timestamptz default now(),
    conducting_user_id bigint default null
) returns bigint as
$$
<<locals>> declare
    transaction_id  bigint;
    temp_account_id bigint;
begin
    if vouchers_amount * amount < 0 then raise 'vouchers_amount and amount must have the same sign'; end if;

    if amount < 0 or vouchers_amount < 0 then
        -- swap account on negative amount, as only non-negative transactions are allowed
        temp_account_id = source_account_id;
        source_account_id = target_account_id;
        target_account_id = temp_account_id;
        amount = -amount;
        vouchers_amount = -vouchers_amount;
    end if;

    -- add new transaction
    insert into transaction (
        order_id, description, source_account, target_account, amount, vouchers, booked_at, conducting_user_id
    )
    values (
        book_transaction.order_id,
        book_transaction.description,
        book_transaction.source_account_id,
        book_transaction.target_account_id,
        book_transaction.amount,
        book_transaction.vouchers_amount,
        book_transaction.booked_at,
        book_transaction.conducting_user_id
    )
    returning id into locals.transaction_id;

    -- update account values
    update account set balance = balance - amount, vouchers = vouchers - vouchers_amount where id = source_account_id;
    update account set balance = balance + amount, vouchers = vouchers + vouchers_amount where id = target_account_id;

    return locals.transaction_id;

end;
$$ language plpgsql
    set search_path = "$user", public;

create or replace function user_privileges_at_node(
    user_id bigint
)
returns table (
    node_id bigint,
    role_ids bigint array,
    privileges_at_node text array
)
as
$$
with recursive graph (node_id, path, cycle, role_ids, privileges_at_node) as (
    -- base case: start at the requested node
    select
        0::bigint, -- root node ID
        '{0}'::bigint[],
        false,
        coalesce((
            select array_agg(utr3.role_id)
            from user_to_role utr3
            where utr3.node_id = 0 and utr3.user_id = user_privileges_at_node.user_id),
            '{}'::bigint array
        ) as role_ids,
        coalesce((
            select array_agg(urtp.privilege)
            from user_role_to_privilege urtp join user_to_role utr2 on urtp.role_id = utr2.role_id
            where utr2.node_id = 0 and utr2.user_id = user_privileges_at_node.user_id),
            '{}'::text array
        ) as privileges_at_node
    union all
    -- add the node's children result set (find the parents for all so-far evaluated nodes)
    select
        node.id,
        g.path || node.parent,
        node.id = any(g.path),
        g.role_ids || (
            select coalesce(array_agg(utr2.role_id), '{}'::bigint array)
            from user_to_role utr2
            where utr2.node_id = node.id and utr2.user_id = user_privileges_at_node.user_id
        )::bigint array,
        g.privileges_at_node || (
            select coalesce(array_agg(t.privileges), '{}'::text array)
            from (
                select unnest(urwp.privileges) as privileges
                from user_role_with_privileges urwp join user_to_role utr3 on urwp.id = utr3.role_id
                where utr3.node_id = node.id and utr3.user_id = user_privileges_at_node.user_id
            ) t
        )::text array
    from
        graph g
        join node on g.node_id = node.parent
    where
        node.id != 0
        and not g.cycle
)
select
    g.node_id,
    g.role_ids,
    g.privileges_at_node
from graph g;
$$ language sql
    stable
    security invoker
    set search_path = "$user", public;

create or replace function order_value_prefiltered(
    order_ids bigint[]
) returns setof order_value as
$$
begin
    -- this needs to be kept in sync with order_value
    return query select
        ordr.*,
        ut.uid                                      as customer_tag_uid,
        ut.id                                       as customer_tag_id,
        coalesce(li.total_price, 0)                 as total_price,
        coalesce(li.total_tax, 0)                   as total_tax,
        coalesce(li.total_no_tax, 0)                as total_no_tax,
        coalesce(li.line_items, json_build_array()) as line_items
    from ordr
        left join line_item_aggregated_json li ON ordr.id = li.order_id and li.order_id = any(order_value_prefiltered.order_ids)
        left join account a on ordr.customer_account_id = a.id
        left join user_tag ut on a.user_tag_id = ut.id
        where ordr.id = any(order_value_prefiltered.order_ids);

end;
$$ language plpgsql
    set search_path = "$user", public;

create or replace function orders_at_node_and_children(
    node_id bigint
) returns setof order_value as
$$

select
    o.*
from order_value o
    join till t on o.till_id = t.id
    join node n on n.id = t.node_id
where
    orders_at_node_and_children.node_id = any(n.parent_ids) or n.id = orders_at_node_and_children.node_id;

$$ language sql
    stable
    security invoker
    set search_path = "$user", public;
