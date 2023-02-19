-- revision: 62df6b55
-- requires: null

-- stustapay core database
--
-- (c) 2022-2023 Jonas Jelten <jj@sft.lol>
--
-- targets >=postgresql-13
--
-- double-entry bookkeeping for festival payment system.
-- - user identification through tokens
-- - accounts for users, ware input/output and payment providers
-- - products with custom tax rates
-- - terminal configuration profiles

-- security definer functions are executed in setuid-mode
-- to grant access to them, use:
--   grant execute on function some_function_name to some_insecure_user;

begin;

set plpgsql.extra_warnings to 'all';


-------- tables

-- general key-value config
create table if not exists config (
    key text not null primary key,
    value text
);
insert into config (
    key, value
)
values
    -- event organizer name
    ('bon.issuer', 'der verein'),
    -- event organizer address
    ('bon.addr', E'Müsterstraße 12\n12398 Test Stadt'),
    -- title on top of the bon. This usually is the name of the event like StuStaCulum 2023
    ('bon.title', 'StuStaCulum 2023'),
    -- json array. One of the strings is printed at the end of a bon
    ('bon.closing_texts', '["funny text 0", "funny text 1", "funny text 2", "funny text 3"]'),

    -- Umsatzsteuer ID. Needed on each bon
    ('ust_id', 'DE123456789')
    on conflict do nothing;


-- some secret about one or many tokens
create table if not exists token_secret (
    id bigserial not null primary key
);

-- for wristbands/cards/...
create table if not exists token(
    id bigserial not null primary key,
    -- hardware id of the token
    uid text not null,
    -- printed on the back
    pin text,
    -- produced by wristband vendor
    serial text,

    -- to validate token authenticity
    -- secret maybe shared with several tokens.
    secret int references token_secret(id) on delete restrict
);
create index if not exists token_uid ON token USING btree (uid);


create table if not exists account_type (
    name text not null primary key
);
insert into account_type (
    name
)
values
    -- for entry/exit accounts
    ('virtual'),

    -- for safe, backpack, ec, ...
    ('internal'),

    -- the one you buy drinks with
    ('private')

    -- todo: cash_drawer, deposit,
    on conflict do nothing;



-- bookkeeping account
create table if not exists account (
    id bigserial not null primary key,
    token_id bigint references token(id) on delete cascade,
    type text references account_type(name) on delete restrict,
    name text,
    comment text,

    -- current balance, updated on each transaction
    balance numeric not null default 0


    -- todo: voucher
    -- todo: topup-config
);


-- people working with the payment system
create table if not exists usr (
    id serial not null primary key,

    name text not null unique,
    password text,
    description text,

    -- e.g. the backpack-account, or the cash drawer
    account bigint references account(id) on delete restrict
);


create table if not exists usr_session (
    id serial not null primary key,
    usr int references usr(id) on delete cascade not null
);


create table if not exists privilege (
    name text not null primary key
);
insert into privilege (
    name
)
values
    ('admin'),
    ('orga'),
    ('cashier')
    on conflict do nothing;

create table if not exists usr_privs (
    usr int references usr(id) on delete cascade,
    priv text references privilege(name) on delete cascade
);


create table if not exists payment_method (
    name text not null primary key
);
insert into payment_method (
    name
)
values
    -- when topping up with cash
    ('cash'),

    -- when topping up with ec
    ('ec'),

    -- payment with token
    ('token')

    -- todo: paypal

    on conflict do nothing;

create table if not exists order_type(
    name text not null primary key
);
insert into order_type (
    name
)
values
    -- load token with cash
    ('topup_cash'),
    -- load token with ec
    ('topup_ec'),
    -- load token with paypal
    ('topup_paypal'),
    -- buy items to consume
    ('buy_wares')
    on conflict do nothing;


create table if not exists tax (
    name text not null primary key,
    rate numeric not null,
    description text not null
);
insert into tax (
    name, rate, description
)
values
    -- for internal transfers
    ('none', 0.0, 'keine Steuer'),

    -- reduced sales tax for food etc
    -- ermäßigte umsatzsteuer in deutschland
    ('eust', 0.07, 'ermäßigte Umsatzsteuer'),

    -- normal sales tax
    -- umsatzsteuer in deutschland
    ('ust', 0.19, 'normale Umsatzsteuer')

    on conflict do nothing;



create table if not exists product (
    id serial not null primary key,

    -- todo: ean or something for receipt?

    name text not null unique,

    -- price including tax (what is charged in the end)
    price numeric not null,

    -- todo: payment possible with voucher?
    -- how many vouchers of which kind does it cost?

    tax name not null references tax(name) on delete restrict
);


create table if not exists terminal_layout (
    id serial not null primary key,
    name text not null,
    description text,
    config json
);


create table if not exists terminal_profile (
    id serial not null primary key,
    name text not null,
    description text,
    layout_id int references terminal_layout(id)
    -- todo: payment_methods?
);


-- which cash desks do we have and in which state are they
create table if not exists terminal (
    id serial not null primary key,
    name text not null,
    description text,
    registration_uuid uuid unique,
    session_uuid uuid unique,

    -- how this terminal is mapped to a tse
    tse_id text,

    -- identifies the current active work shift and configuration
    active_shift text,
    active_profile_id int references terminal_profile(id) on delete restrict,
    active_cashier_id int references usr(id) on delete restrict,

    constraint registration_or_session_uuid_null check ((registration_uuid is null) <> (session_uuid is null))
);


create table if not exists order_status (
    name text not null primary key
);
insert into order_status (
    name
)
values
    ('pending'),
    ('done'),
    ('cancelled')
    -- tsesig? draft? paid?

    on conflict do nothing;

-- represents an order of an customer, like buying wares or top up
create table if not exists ordr (
    id bigserial not null primary key,
    uuid uuid not null default gen_random_uuid() unique,

    -- order values can be obtained with order_value

    -- how many line items does this transaction have
    -- determines the next lineitem id
    itemcount int not null default 0,

    status text not null references order_status(name) on delete restrict,
    created_at timestamptz not null default now(),
    finished_at timestamptz,

    -- todo: who triggered the transaction (user)

    -- how the order was invoked
    payment_method text references payment_method(name) on delete restrict,
    -- todo: method_info references payment_information(id) -> (sumup-id, paypal-id, ...)
    --       or inline-json without separate table?

    -- type of the order like, top up, buy beer,
    order_type text references order_type(name) on delete restrict,

    -- who created it
    cashier_id int not null references usr(id) on delete restrict,
    terminal_id int not null references terminal(id) on delete restrict,
    -- customer is allowed to be null, as it is only known on the final booking, not on the creation of the order
    -- canceled orders can have no
    customer_account_id int references account(id) on delete restrict
);

-- all products in a transaction
create table if not exists lineitem (
    order_id bigint not null references ordr(id) on delete cascade,
    item_id int not null,
    primary key(order_id, item_id),

    product_id int not null references product(id) on delete restrict,

    quantity int not null default 1,

    -- price with tax
    price numeric not null,

    -- tax amount
    tax_name text,
    tax_rate numeric

    -- todo: voucher amount
);

create or replace view lineitem_tax as
    select
        *,
        price * quantity as total_price,
        round(price * quantity * tax_rate / (1 + tax_rate ), 2) as total_tax
    from
         lineitem;


-- aggregates the lineitem's amounts
create or replace view order_value as
    select
        ordr.*,
        sum(total_price) as value_sum,
        sum(total_tax) as value_tax,
        sum(total_price - total_tax) as value_notax
    from
        ordr
        left join lineitem_tax
            on (ordr.id = lineitem_tax.order_id)
    group by
        ordr.id;

-- show all line items
create or replace view order_items as
    select
        ordr.*,
        lineitem.*
    from
        ordr
        left join lineitem
            on (ordr.id = lineitem.order_id);

-- aggregated tax rate of items
create or replace view order_tax_rates as
    select
        ordr.*,
        tax_name,
        tax_rate,
        sum(total_price) as value_sum,
        sum(total_tax) as value_tax,
        sum(total_price - total_tax) as value_notax
    from
        ordr
        left join lineitem_tax
            on (ordr.id = order_id)
        group by
            ordr.id, tax_rate, tax_name;


create table if not exists transaction (
    -- represents a transaction of one account to another
    -- one order can consist of multiple transactions, hence the extra table
    --      e.g. wares to the ware output account
    --      and deposit to a specific deposit account
    id bigserial not null primary key,
    order_id bigint references ordr(id) on delete restrict,

    -- what was booked in this transaction  (backpack, items, ...)
    description text,

    source_account int not null references account(id) on delete restrict,
    target_account int not null references account(id) on delete restrict,
    constraint source_target_account_different check (source_account <> target_account),

    booked_at timestamptz not null default now(),

    -- amount being transferred from source_account to target_account
    amount numeric not null,
    constraint amount_positive check (amount >= 0),
    tax_rate numeric not null, -- how much tax is included in the amount
    tax_name text not null
);


-- book a new transaction and update the account balances automatically, returns the new transaction_id
create or replace function book_transaction (
    order_id bigint,
    description text,
    source_account_id bigint,
    target_account_id bigint,
    amount numeric,
    tax_name text
)
    returns bigint as $$
<<locals>> declare
    transaction_id bigint;
    tax_rate numeric;
begin
    -- resolve tax rate
    select rate from tax where name = tax_name into locals.tax_rate;
    if locals.tax_rate is null then
        raise 'unknown tax name';
    end if;

    -- add new transaction
    insert into transaction (
        order_id, description, source_account, target_account, amount, tax_rate, tax_name
    )
    values (
        book_transaction.order_id,
        book_transaction.description,
        book_transaction.source_account_id,
        book_transaction.target_account_id,
        book_transaction.amount,
        locals.tax_rate,
        book_transaction.tax_name
    ) returning id into locals.transaction_id;

    -- update account values
    update account set
        balance = balance - amount
        where id = source_account_id;
    update account set
        balance = balance + amount
        where id = target_account_id;

    return locals.transaction_id;

end;
$$ language plpgsql;


-- requests the tse module to sign something
create table if not exists tse_signature (
    id serial not null primary key references ordr(id) on delete cascade,

    signed bool default false,
    status text,

    tse_transaction text,
    tse_signaturenr text,
    tse_start       text,
    tse_end         text,
    tse_serial      text,
    tse_hashalgo    text,
    tse_signature   text
);


-- requests the bon generator to create a new receipt
create table if not exists bon (
    id bigint not null primary key references ordr(id) on delete cascade,

    generated bool default false,
    generated_at timestamptz,
    status text,
    -- latex compile error
    error text,

    -- output file path
    output_file text
);


-- wooh \o/
commit;
