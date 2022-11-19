-- stustapay database
--
-- (c) 2022 Jonas Jelten <jj@sft.lol>
--
-- security stuff:
-- security definer functions are executed in setuid-mode
-- to grant access to them, use:
--   grant execute on function some_function_name to some_insecure_user;

begin;

set plpgsql.extra_warnings to 'all';
set lc_monetary to "de_DE.utf8";

-- the user loading this file needs superuser access,
-- because the loaded python is untrusted code.
--do $$ begin
--    create language plpython3u;
--exception
--    when duplicate_object then null;
--end $$;

-- pgcrypto for randomness and hashing
do $$ begin
    create extension pgcrypto;
exception
    when duplicate_object then null;
end $$;


-- permission definitions for door users
create table if not exists account(
    id bigserial primary key not null,
    sban text unique not null,
    balance money not null default 0
);



do $$ begin
    create type product_type as enum ('buy', 'topup');
exception
    when duplicate_object then null;
end $$;


create table if not exists product(
    id bigserial primary key not null,
    name text unique not null,
    price money not null default 0,
    category product_type not null
);


do $$ begin
    create type booking_status as enum ('pending', 'booked');
exception
    when duplicate_object then null;
end $$;


create table if not exists booking(
    id bigserial primary key not null,
    account bigint references account(id),
    created timestamptz not null default now(),
    booked timestamptz,
    status booking_status not null
);


create table if not exists line_item(
    id bigserial primary key not null,
    booking bigint references booking(id),
    product bigint references product(id),
    amount int not null
);


-- create a new booking
create or replace function create_order()
    returns bigint as $$
declare order_id bigint;
begin
    insert into booking (status) values ('pending') returning id into order_id;
    return order_id;
end;
$$ language plpgsql;


-- show current order items
create or replace function show_order(
    order_id bigint
) returns table (
    id bigint,
    name text,
    price money,
    amount int
) as $$
begin
    return query select p.id, p.name, p.price, l.amount from line_item l join product p on product = p.id where booking = order_id;
end;
$$ language plpgsql;


-- add items to existing booking
create or replace function add_to_order(
    order_id bigint,
    product_id bigint,
    quantity int default 1
) returns table (
    id bigint,
    name text,
    price money,
    amount int
) as $$
declare already_booked booking_status;
begin
    -- check if order is already processed
    select status into already_booked from booking where booking.id = order_id;
    if already_booked = 'booked'::booking_status then
        raise 'order already booked';
    elsif already_booked is null then
        raise 'order not found';
    end if;

    insert into line_item (booking, product, amount) values (order_id, product_id, quantity);

    -- todo: call show_order above :)
    return query select p.id, p.name, p.price, l.amount from line_item l join product p on product = p.id where booking = order_id;
end;
$$ language plpgsql;


-- how much funds does a sban have?
create or replace function show_balance(sban text)
    returns text as $$
declare funds money;
declare account_id bigint;
begin
    select balance, id into funds, account_id from account where account.sban = show_balance.sban;

    return json_build_object('funds', funds, 'account_id', account_id)::text;
end;
$$ language plpgsql;


-- add money to a sban
create or replace function top_up(sban text, add_funds money)
    returns text as $$
declare account_id bigint;
declare old_funds money;
declare new_funds money;
begin
    select balance, id into old_funds, account_id from account where account.sban = top_up.sban;
    select (old_funds + add_funds) into new_funds;
    update account set balance = new_funds where id = account_id;

    return json_build_object('old_funds', old_funds,
                             'new_funds', new_funds,
                             'account_id', account_id)::text;
end;
$$ language plpgsql;


create or replace function process_order(
    order_id bigint,
    sban text
)
    returns text as $$
declare old_funds money;
declare new_funds money;
declare order_sum money := null;
declare account_id bigint;
declare already_booked booking_status;
begin
    -- check if order is already processed
    select status into already_booked from booking where booking.id = order_id;
    if already_booked = 'booked'::booking_status then
        raise 'order already booked';
    elsif already_booked is null then
        raise 'order not found';
    end if;

    -- current available funds
    select balance, id into old_funds, account_id from account where account.sban = process_order.sban;
    if account_id is null then
	    raise 'account not found';
    end if;

    select sum(price * amount) into order_sum
    from line_item
         join product on (product.id = line_item.product)
    where process_order.order_id = line_item.booking;
    if order_sum is null then
        raise 'empty order';
    end if;

    if old_funds < order_sum then
        raise 'not enough funds on account: % < % needed', old_funds, order_sum;
    end if;

    select (old_funds - order_sum) into new_funds;
    update account set balance = new_funds where id = account_id;

    update booking set account = account_id, booked = now(), status = 'booked' where booking.id = order_id;

    return json_build_object('price', order_sum,
                             'account_id', account_id,
                             'old_funds', old_funds,
                             'new_funds', new_funds)::text;
end;
$$ language plpgsql;


create or replace function get_products(
    category product_type default 'buy'
) returns table (
    id bigint,
    name text,
    price money
) as $$
begin
    return query select product.id, product.name, product.price from product where product.category = get_products.category;
end;
$$ language plpgsql;



create or replace function create_account(
    sban text
)
    returns text as $$
declare account_id bigint;
begin
    -- maybe use gen_random_uuid()::text
    insert into account (sban) values (sban) returning id into account_id;
    return json_build_object('account_id', account_id)::text;
end;
$$ language plpgsql;

end;
