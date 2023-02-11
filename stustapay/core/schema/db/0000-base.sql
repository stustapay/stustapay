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
    ('receipt_addr', 'StuStaPay Payment System')

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
    tokenid bigint references token(id) on delete cascade,
    type text references account_type(name) on delete restrict,
    name text,
    comment text,
    balance numeric not null default 0

    -- todo: voucher
    -- todo: topup-config
);


-- people working with the payment system
create table if not exists usr (
    id serial not null primary key,

    name text,
    description text,

    -- e.g. the backpack-account, or the cash drawer
    account bigint references account(id) on delete restrict
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

    name text,

    -- price without tax, null if free price
    price numeric,

    -- if bought, where is this booked to
    -- basically the transaction kind
    -- so we can differentiate between wares, deposit, cash-in-backpack transfer
    target_account int references account(id) on delete restrict,

    -- todo: payment possible with voucher?
    -- how many vouchers of which kind does it cost?

    tax name not null references tax(name) on delete restrict
);


create table if not exists cash_desk_layout (
    id serial not null primary key,
    name text not null,
    description text,
    config json
);


create table if not exists cash_desk_profile (
    id serial not null primary key,
    name text not null,
    description text,
    layout int references cash_desk_layout(id)
    -- todo: payment_methods?
);


-- which cash desks do we have and in which state are they
create table if not exists terminal (
    id serial not null primary key,
    name text,
    description text,

    -- how this terminal is mapped to a tse
    tseid text,

    -- identifies the current active work shift and configuration
    active_shift text,
    active_profile int references cash_desk_profile(id) on delete restrict,
    active_cashier int references usr(id) on delete restrict
);


create table if not exists tx_status (
    name text not null primary key
);
insert into tx_status (
    name
)
values
    ('pending'),
    ('done'),
    ('cancelled')
    -- tsesig? draft? paid?

    on conflict do nothing;


create table if not exists transaction (
    id bigserial not null primary key,

    -- transaction values can be obtained with transaction_value

    -- how many line items does this transaction have
    -- determines the next lineitem id
    itemcount int not null default 0,

    status text not null references tx_status(name) on delete restrict,
    created_at timestamptz not null default now(),
    finished_at timestamptz,

    -- todo: who triggered the transaction (user)

    -- how the transaction was invoked
    txmethod text references payment_method(name) on delete restrict,
    -- todo: method_info references payment_information(id) -> (sumup-id, paypal-id, ...)
    --       or inline-json without separate table?

    source_account int references account(id) on delete restrict,
    target_account int references account(id) on delete restrict,

    -- who created it
    cashierid int references usr(id) on delete restrict,
    terminalid int references terminal(id) on delete restrict
);

-- all products in a transaction
create table if not exists lineitem (
    txid bigint not null references transaction(id) on delete cascade,
    itemid int not null,
    primary key(txid, itemid),

    productid int not null references product(id) on delete restrict,

    quantity int not null default 1,

    -- price without tax
    price numeric not null,

    -- tax amount
    tax_name text,
    tax_rate numeric

    -- todo: voucher amount
);

-- aggregates the lineitem's amounts
create or replace view transaction_value as
    select
        tx.*,
        sum((price + price * tax_rate) * quantity) as value_sum,
        sum(price * tax_rate * quantity) as value_tax,
        sum(price * quantity) as value_notax
    from
        transaction tx
        left join lineitem
            on (tx.id = lineitem.txid)
    group by
        tx.id;

-- show all line items
create or replace view transaction_items as
    select
        tx.*,
        lineitem.*
    from
        transaction tx
        left join lineitem
            on (tx.id = lineitem.txid);


-- requests the tse module to sign something
create table if not exists tse_signature (
    id serial not null primary key references transaction(id) on delete cascade,

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
    id bigint not null primary key references transaction(id) on delete cascade,

    generated bool default false,
    generated_at timestamptz,
    status text,

    -- output file path
    output_file text
);


-------- functions


create or replace function order_cancel(
    order_id bigint
)
    returns text as $$
declare
    already_booked text;
begin
    select status into already_booked from transaction where transaction.id = order_id;
    if already_booked is null then
        raise 'order not found';
    end if;
    if already_booked != 'pending' then
        raise 'order not in pending state';
    end if;

    update transaction
    set status = 'cancelled',
        finished_at = now()
    where transaction.id = order_id;
end;
$$ language plpgsql;





-- wooh \o/
commit;
