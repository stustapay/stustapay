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

-- sql type function to the query planner can optimize it
create or replace function product_stats(
    from_timestamp timestamptz,
    to_timestamp timestamptz
)
    returns table (
--     till_profile_id bigint,  -- does not make much sense as the profile could change
        till_id       bigint,
        product_id    bigint,
        quantity_sold bigint
    )
as
$$
select
    o.till_id,
    li.product_id,
    sum(li.quantity) as quantity_sold
from
    line_item li
    join ordr o on li.order_id = o.id
where
    o.order_type != 'cancel_order'
    and (from_timestamp is not null and o.booked_at >= from_timestamp or from_timestamp is null)
    and (to_timestamp is not null and o.booked_at <= to_timestamp or to_timestamp is null)
group by
    o.till_id, li.product_id;
$$ language sql
    stable
    security invoker
    set search_path = "$user", public;

create or replace function voucher_stats(
    from_timestamp timestamptz,
    to_timestamp timestamptz
)
    returns table (
        vouchers_issued bigint,
        vouchers_spent  bigint
    )
as
$$
select
    sum(case when t.source_account = 6 then t.vouchers else 0 end)  as vouchers_issued,
    sum(case when t.source_account != 6 then t.vouchers else 0 end) as vouchers_spent
from
    transaction t
where
    (from_timestamp is not null and t.booked_at >= from_timestamp or from_timestamp is null)
    and (to_timestamp is not null and t.booked_at <= to_timestamp or to_timestamp is null);
$$ language sql
    stable
    security invoker
    set search_path = "$user", public;
