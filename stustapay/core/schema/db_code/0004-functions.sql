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

create or replace function node_with_user_roles(
    user_id bigint
)
returns table (
    id bigint,
    parent bigint,
    name text,
    description text,
    event_id bigint,
    path text,
    parent_ids bigint array,
    event_node_id bigint,
    parents_until_event_node bigint array,
    forbidden_objects_at_node varchar(255) array,
    computed_forbidden_objects_at_node varchar(255) array,
    forbidden_objects_in_subtree varchar(255) array,
    computed_forbidden_objects_in_subtree varchar(255) array,
    event json,
    roles_at_node json
)
as
$$
select
    n.*,
    coalesce((select json_agg(roles) from (
        select r.*
        from user_to_role utr
        join user_role_with_privileges r on utr.role_id = r.id
        where (utr.node_id = any(n.parent_ids) or utr.node_id = n.id) and utr.user_id = node_with_user_roles.user_id
    ) roles), '[]'::json) as roles_at_node
from node_with_allowed_objects n
$$ language sql
    stable
    security invoker
    set search_path = "$user", public;
