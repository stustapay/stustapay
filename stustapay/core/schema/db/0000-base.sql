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


create table if not exists restriction_type (
    name text not null primary key
);
insert into restriction_type (
    name
)
values
    ('under_18'),
    ('under_16')
    on conflict do nothing;


-- some secret about one or many user_tags
create table if not exists user_tag_secret (
    id bigserial not null primary key
);

-- for wristbands/cards/...
create table if not exists user_tag (
    id bigserial not null primary key,
    -- hardware id of the tag
    uid numeric(20) not null unique,
    -- printed on the back
    pin text,
    -- produced by wristband vendor
    serial text,
    -- age restriction information
    restriction text references restriction_type(name),

    -- to validate tag authenticity
    -- secret maybe shared with several tags.
    secret int references user_tag_secret(id) on delete restrict
);


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
    user_tag_id bigint references user_tag(id) on delete cascade,
    type text not null references account_type(name) on delete restrict,
    name text,
    comment text,

    -- current balance, updated on each transaction
    balance numeric not null default 0


    -- todo: voucher
    -- todo: topup-config
);
insert into account (
    id, user_tag_id, type, name, comment
)
values
    -- virtual accounts are hard coded with ids 0-99
    (0, null, 'virtual', 'Sale Exit', 'target account for sales of the system'),
    (1, null, 'virtual', 'Cash Entry', 'source account, when cash is brought in the system (cash top_up, ...)'),
    (2, null, 'virtual', 'Deposit', 'Deposit currently at the customers'),
    (3, null, 'virtual', 'Sumup', 'source account for sumup top up '),
    (4, null, 'virtual', 'Cash Vault', 'Main Cash tresor. At some point cash top up lands here')
    on conflict do nothing;
select setval('account_id_seq', 100);


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
    usr int not null references usr(id) on delete cascade
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
    usr int not null references usr(id) on delete cascade,
    priv text not null references privilege(name) on delete cascade
);

create or replace view usr_with_privileges as (
    select
        usr.*,
        coalesce(privs.privs, '{}'::text array) as privileges
    from usr
    left join (
        select p.usr as user_id, array_agg(p.priv) as privs
        from usr_privs p
        group by p.usr
    ) privs on usr.id = privs.user_id
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
    -- load token with sumup
    ('topup_sumup'),
    -- load token with paypal
    ('topup_paypal'),
    -- buy items to consume
    ('sale')
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

    -- if target account is set, the product is booked to this specific account,
    -- e.g. for the deposit account, or a specific exit account (for beer, ...)
    target_account_id int references account(id) on delete restrict,

    -- todo: payment possible with voucher?
    -- how many vouchers of which kind does it cost?

    tax_name text not null references tax(name) on delete restrict
);

-- which products are not allowed to be bought with the user tag restriction (eg beer, below 16)
create table if not exists product_restriction (
    id bigint not null references product(id) on delete cascade,
    restriction text not null references restriction_type(name) on delete restrict ,
    primary key (id, restriction)
);

create or replace view product_as_json as (
    select p.id, json_agg(p)->0 as json
    from product p
    group by p.id
);

create table if not exists terminal_layout (
    id serial not null primary key,
    name text not null unique,
    description text
);

create table if not exists terminal_button (
    id serial not null primary key,
    name text not null unique
);

create table if not exists terminal_button_product (
    button_id int not null references terminal_button(id) on delete cascade,
    product_id int not null references product(id) on delete cascade,
    primary key(button_id, product_id)
);

create or replace view terminal_button_with_products as (
    select
        t.*,
        coalesce(j_view.price, 0) as price,
        coalesce(j_view.product_ids, '{}'::int array) as product_ids
    from terminal_button t
    left join (
        select tlb.button_id, sum(p.price) as price, array_agg(tlb.product_id) as product_ids
        from terminal_button_product tlb
        join product p on tlb.product_id = p.id
        group by tlb.button_id
    ) j_view on t.id = j_view.button_id
);

create table if not exists terminal_layout_to_button (
    layout_id int not null references terminal_layout(id) on delete cascade,
    button_id int not null references terminal_button(id) on delete restrict,
    sequence_number int not null unique,
    primary key (layout_id, button_id)
);

create or replace view terminal_layout_with_buttons as (
    select t.*, coalesce(j_view.button_ids, '{}'::int array) as button_ids
    from terminal_layout t
    left join (
        select tltb.layout_id, array_agg(tltb.button_id order by tltb.sequence_number) as button_ids
        from terminal_layout_to_button tltb
        group by tltb.layout_id
    ) j_view on t.id = j_view.layout_id
);

create table if not exists terminal_profile (
    id serial not null primary key,
    name text not null unique,
    description text,
    layout_id int not null references terminal_layout(id) on delete restrict
    -- todo: payment_methods?
);

-- which cash desks do we have and in which state are they
create table if not exists terminal (
    id serial not null primary key,
    name text not null unique,
    description text,
    registration_uuid uuid unique,
    session_uuid uuid unique,

    -- how this terminal is mapped to a tse
    tse_id text,

    -- identifies the current active work shift and configuration
    active_shift text,
    active_profile_id int not null references terminal_profile(id) on delete restrict,
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
        l.*,
        l.price * l.quantity as total_price,
        round(l.price * l.quantity * l.tax_rate / (1 + l.tax_rate ), 2) as total_tax,
        p.json as product
    from lineitem l join product_as_json p on l.product_id = p.id;

-- aggregates the lineitem's amounts
create or replace view order_value as
    select
        ordr.*,
        sum(total_price) as value_sum,
        sum(total_tax) as value_tax,
        sum(total_price - total_tax) as value_notax,
        json_agg(lineitem_tax) as line_items
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
    temp_account_id bigint;
begin
    -- resolve tax rate
    select rate from tax where name = tax_name into locals.tax_rate;
    if locals.tax_rate is null then
        raise 'unknown tax name';
    end if;

    if amount < 0 then
        -- swap account on negative amount, as only non-negative transactions are allowed
        temp_account_id = source_account_id;
        source_account_id = target_account_id;
        target_account_id = temp_account_id;
        amount = -amount;
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
