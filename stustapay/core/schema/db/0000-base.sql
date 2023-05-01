-- revision: 62df6b55
-- requires: null

-- stustapay core database
--
-- (c) 2022-2023 Jonas Jelten <jj@sft.lol>
-- (c) 2022-2023 Leo Fahrbach <leo.fahrbach@stusta.de>
--
-- targets >=postgresql-13
--
-- double-entry bookkeeping for festival payment system.
-- - user identification through tokens
-- - accounts for users, ware input/output and payment providers
-- - products with custom tax rates
-- - till configuration profiles

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
    ('ust_id', 'DE123456789'),
    ('currency.symbol', '€'),
    ('currency.identifier', 'EUR')
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
    id bigint primary key generated always as identity,
    key0 bytea not null,
    key1 bytea not null
);


-- for wristbands/cards/...
create table if not exists user_tag (
    -- hardware id of the tag
    uid numeric(20) primary key,
    -- printed on the back
    pin text,
    -- custom serial number secretly stored on each chip
    serial text,
    -- age restriction information
    restriction text references restriction_type(name),

    -- to validate tag authenticity
    -- secret maybe shared with several tags.
    secret bigint references user_tag_secret(id)
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
    id bigint primary key generated always as identity (start with 1000),
    user_tag_uid numeric(20) unique references user_tag(uid),
    type text not null references account_type(name),
    constraint private_account_requires_user_tag check (user_tag_uid is not null = (type = 'private')),
    name text,
    comment text,

    -- current balance, updated on each transaction
    balance numeric not null default 0,
    -- current number of vouchers, updated on each transaction
    vouchers bigint not null default 0

    -- todo: topup-config
);
insert into account (
    id, user_tag_uid, type, name, comment
) overriding system value
values
    -- virtual accounts are hard coded with ids 0-99
    (0, null, 'virtual', 'Sale Exit', 'target account for sales of the system'),
    (1, null, 'virtual', 'Cash Entry', 'source account, when cash is brought in the system (cash top_up, ...)'),
    (2, null, 'virtual', 'Deposit', 'Deposit currently at the customers'),
    (3, null, 'virtual', 'Sumup', 'source account for sumup top up '),
    (4, null, 'virtual', 'Cash Vault', 'Main Cash tresor. At some point cash top up lands here'),
    (5, null, 'virtual', 'Imbalace', 'Imbalance on a cash register on settlement'),
    (6, null, 'virtual', 'Money / Voucher create', 'Account which will be charged on manual account balance updates and voucher top ups'),
    (7, null, 'virtual', 'Cash Exit', 'target account when cash exists the system, e.g. cash pay outs')
    on conflict do nothing;

create table if not exists account_tag_association_history (
    account_id bigint not null references account(id),
    user_tag_uid numeric(20) references user_tag(uid),
    mapping_was_valid_until timestamptz not null default now(),
    primary key (account_id, user_tag_uid, mapping_was_valid_until)
);

create or replace function update_tag_association_history() returns trigger as
$$
begin
    -- this check is already done in the trigger definition but still included here as to not forget it in the future
    if NEW.user_tag_uid = OLD.user_tag_uid or OLD.user_tag_uid is null then
        return NEW;
    end if;
    insert into account_tag_association_history (account_id, user_tag_uid)
    values (NEW.id, OLD.user_tag_uid);
    return NEW;
end
$$ language plpgsql;

create trigger update_tag_association_history_trigger
    after update of user_tag_uid on account
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid and OLD.user_tag_uid is not null)
    execute function update_tag_association_history();

-- people working with the payment system
create table if not exists usr (
    id bigint primary key generated always as identity,

    login text not null unique,
    constraint login_encoding check ( login ~ '[a-zA-Z0-9\-_]+' ),
    password text,

    display_name text not null default '',
    description text,

    user_tag_uid numeric(20) unique references user_tag(uid) on delete restrict,

    transport_account_id bigint references account(id),
    cashier_account_id bigint references account(id)
    -- depending on the transfer action, the correct account is booked

    constraint password_or_user_tag_uid_set check ((user_tag_uid is not null) or (password is not null))
);
comment on column usr.transport_account_id is 'account for orgas to transport cash from one location to another';
comment on column usr.cashier_account_id is 'account for cashiers to store the current cash balance in input or output locations';


create table if not exists usr_session (
    id bigint primary key generated always as identity,
    usr bigint not null references usr(id) on delete cascade
);

create table if not exists customer_session (
    id bigint primary key generated always as identity,
    customer bigint not null references account(id) on delete cascade
);


create table if not exists privilege (
    name text not null primary key
);
insert into privilege (
    name
)
values
    -- Super Use
    ('admin'),
    -- Finanzorga
    ('finanzorga'),
    -- Standleiter
    -- ('orga'),
    -- Helfer
    ('cashier')
    on conflict do nothing;

create table if not exists usr_privs (
    usr bigint not null references usr(id) on delete cascade,
    priv text not null references privilege(name) on delete cascade,
    primary key (usr, priv)
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

    -- when topping up with sumup
    ('sumup'),

    -- payment with tag
    ('tag')

    -- todo: paypal

    on conflict do nothing;

create table if not exists order_type(
    name text not null primary key
);
insert into order_type (
    name
)
values
    -- top up customer account
    ('top_up'),
    -- buy items to consume
    ('sale'),
    -- cancel a sale
    ('cancel_sale'),
    -- pay out remaining balance on a tag
    ('pay_out'),
    -- sale of a ticket in combination with an initial top up
    ('ticket')
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
    -- for internal transfers, THIS LINE MUST NOT BE DELETED, EVEN BY AN ADMIN
    ('none', 0.0, 'keine Steuer'),

    -- reduced sales tax for food etc
    -- ermäßigte umsatzsteuer in deutschland
    ('eust', 0.07, 'ermäßigte Umsatzsteuer'),

    -- normal sales tax
    -- umsatzsteuer in deutschland
    ('ust', 0.19, 'normale Umsatzsteuer'),

    -- no tax, when we're the payment system of another legal entity.
    ('transparent', 0.0, 'abgeführt von Begünstigtem')

    on conflict do nothing;


create table if not exists product (
    id bigint primary key generated always as identity (start with 1000),
    -- todo: ean or something for receipt?
    name text not null unique,

    price numeric,
    fixed_price boolean not null default true,
    price_in_vouchers bigint, -- will be null if this product cannot be bought with vouchers
    constraint product_vouchers_only_with_fixed_price check ( price_in_vouchers is not null and fixed_price or price_in_vouchers is null ),
    constraint product_not_fixed_or_price check ( price is not null = fixed_price),
    constraint product_price_in_vouchers_not_zero check ( price_in_vouchers <> 0 ),  -- should be null to avoid divbyzero then

    -- whether the core metadata of this product (price, price_in_vouchers, fixed_price, tax_name and target_account_id) is editable
    is_locked bool not null default false,

    -- whether or not this product
    is_returnable bool not null default false,

    -- if target account is set, the product is booked to this specific account,
    -- e.g. for the deposit account, or a specific exit account (for beer, ...)
    target_account_id bigint references account(id),

    tax_name text not null references tax(name)
);
comment on column product.price is 'price including tax (what is charged in the end)';
comment on column product.fixed_price is 'price is not fixed, e.g for top up. Then price=null and set with the api call';


insert into product (id, name, fixed_price, price, tax_name, is_locked) overriding system value
values
    (1, 'Rabatt', false, null, 'none', true),
    (2, 'Aufladen', false, null, 'none', true),
    (3, 'Auszahlen', false, null, 'none', true),
    (4, 'Eintritt', true, 12, 'ust', true);  -- TODO: correct tax for ticket?

-- which products are not allowed to be bought with the user tag restriction (eg beer, below 16)
create table if not exists product_restriction (
    id bigint not null references product(id) on delete cascade,
    restriction text not null references restriction_type(name) on delete cascade,
    unique (id, restriction)
);

create or replace view product_with_tax_and_restrictions as (
    select
        p.*,
        -- price_in_vouchers is never 0 due to constraint product_price_in_vouchers_not_zero
        p.price / p.price_in_vouchers as price_per_voucher,
        tax.rate as tax_rate,
        coalesce(pr.restrictions, '{}'::text array) as restrictions
    from product p
    join tax on p.tax_name = tax.name
    left join (
        select r.id, array_agg(r.restriction) as restrictions
        from product_restriction r
        group by r.id
    ) pr on pr.id = p.id
);

create or replace view product_as_json as (
    select p.id, json_agg(p)->0 as json
    from product_with_tax_and_restrictions p
    group by p.id
);

create table if not exists till_layout (
    id bigint primary key generated always as identity,
    name text not null unique,
    description text
);

create table if not exists till_button (
    id bigint primary key generated always as identity,
    name text not null unique
);

create or replace function check_button_references_locked_products(
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    is_locked boolean;
begin
    select product.is_locked into locals.is_locked
    from product
    where id = check_button_references_locked_products.product_id;
    return locals.is_locked;
end
$$ language plpgsql;

create or replace function check_button_references_max_one_non_fixed_price_product(
    button_id bigint,
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    n_variable_price_products int;
    new_product_is_fixed_price boolean;
begin
    select count(*) into locals.n_variable_price_products
    from till_button_product tlb
    join product p on tlb.product_id = p.id
    where tlb.button_id = check_button_references_max_one_non_fixed_price_product.button_id and not p.fixed_price;

    select product.fixed_price into locals.new_product_is_fixed_price
    from product
    where id = check_button_references_max_one_non_fixed_price_product.product_id;

    return (locals.n_variable_price_products + (not locals.new_product_is_fixed_price)::int) <= 1;
end
$$ language plpgsql;

create or replace function check_button_references_max_one_returnable_product(
    button_id bigint,
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    n_returnable_products int;
    new_product_is_returnable boolean;
begin
    select count(*) into locals.n_returnable_products
    from till_button_product tlb
        join product p on tlb.product_id = p.id
    where tlb.button_id = check_button_references_max_one_returnable_product.button_id and p.is_returnable;

    select product.is_returnable into locals.new_product_is_returnable
    from product
    where id = check_button_references_max_one_returnable_product.product_id;

    return (locals.n_returnable_products + locals.new_product_is_returnable::int) <= 1;
end
$$ language plpgsql;

create or replace function check_button_references_max_one_voucher_product(
    button_id bigint,
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    n_voucher_products int;
    new_product_has_vouchers boolean;
begin
    select count(*) into locals.n_voucher_products
    from till_button_product tlb
        join product p on tlb.product_id = p.id
    where tlb.button_id = check_button_references_max_one_voucher_product.button_id and p.price_in_vouchers is not null;

    select product.price_in_vouchers is not null into locals.new_product_has_vouchers
    from product
    where id = check_button_references_max_one_voucher_product.product_id;

    return (locals.n_voucher_products + locals.new_product_has_vouchers::int) <= 1;
end
$$ language plpgsql;

create table if not exists till_button_product (
    button_id bigint not null references till_button(id) on delete cascade,
    product_id bigint not null references product(id) on delete cascade,
    primary key (button_id, product_id),

    constraint references_only_locked_products check (check_button_references_locked_products(product_id)),
    constraint references_max_one_variable_price_product check (check_button_references_max_one_non_fixed_price_product(button_id, product_id)),
    constraint references_max_one_returnable_product check (check_button_references_max_one_returnable_product(button_id, product_id)),
    constraint references_max_one_voucher_product check (check_button_references_max_one_voucher_product(button_id, product_id))
);

create or replace view till_button_with_products as (
    select
        t.id,
        t.name,
        coalesce(j_view.price, 0) as price, -- sane defaults for buttons without a product
        coalesce(j_view.price_in_vouchers, 0) as price_in_vouchers,
        coalesce(j_view.price_per_voucher, 0) as price_per_voucher,
        coalesce(j_view.fixed_price, true) as fixed_price,
        coalesce(j_view.is_returnable, false) as is_returnable,
        coalesce(j_view.product_ids, '{}'::bigint array) as product_ids
    from till_button t
    left join (
        select
            tlb.button_id,
            sum(coalesce(p.price, 0)) as price,

            -- this assumes that only one product can have a voucher value
            -- because we'd need the products individual voucher prices
            -- and start applying vouchers to the highest price_per_voucher product first.
            sum(coalesce(p.price_in_vouchers, 0)) as price_in_vouchers,
            sum(coalesce(p.price_per_voucher, 0)) as price_per_voucher,

            bool_and(p.fixed_price) as fixed_price, -- a constraint assures us that for variable priced products a button can only refer to one product
            bool_and(p.is_returnable) as is_returnable, -- a constraint assures us that for returnable products a button can only refer to one product
            array_agg(tlb.product_id) as product_ids
        from till_button_product tlb
        join product_with_tax_and_restrictions p on tlb.product_id = p.id
        group by tlb.button_id
        window button_window as (partition by tlb.button_id)
    ) j_view on t.id = j_view.button_id
);

create table if not exists till_layout_to_button (
    layout_id bigint not null references till_layout(id) on delete cascade,
    button_id bigint not null references till_button(id),
    sequence_number bigint not null,
    primary key (layout_id, button_id),
    unique (layout_id, button_id, sequence_number)
);

create or replace view till_layout_with_buttons as (
    select
       t.*,
       coalesce(j_view.button_ids, '{}'::bigint array) as button_ids
    from till_layout t
    left join (
        select tltb.layout_id, array_agg(tltb.button_id order by tltb.sequence_number) as button_ids
        from till_layout_to_button tltb
        group by tltb.layout_id
    ) j_view on t.id = j_view.layout_id
);

create table if not exists till_profile (
    id bigint primary key generated always as identity,
    name text not null unique,
    description text,
    allow_top_up boolean not null default false,
    allow_cash_out boolean not null default false,
    allow_ticket_sale boolean not null default false,
    layout_id bigint not null references till_layout(id)
    -- todo: payment_methods?
);

-- which cash desks do we have and in which state are they
create table if not exists till (
    id bigint primary key generated always as identity,
    name text not null unique,
    description text,
    registration_uuid uuid unique,
    session_uuid uuid unique,

    -- how this till is mapped to a tse
    tse_id text,

    -- identifies the current active work shift and configuration
    active_shift text,
    active_profile_id bigint not null references till_profile(id),
    active_user_id bigint references usr(id),

    constraint registration_or_session_uuid_null check ((registration_uuid is null) != (session_uuid is null))
);

-- represents an order of an customer, like buying wares or top up
create table if not exists ordr (
    id bigint primary key generated always as identity,
    uuid uuid not null default gen_random_uuid() unique,

    -- order values can be obtained with order_value

    -- how many line items does this transaction have
    -- determines the next line_item id
    item_count bigint not null default 0,

    booked_at timestamptz not null default now(),

    -- todo: who triggered the transaction (user)

    -- how the order was invoked
    payment_method text not null references payment_method(name),
    -- todo: method_info references payment_information(id) -> (sumup-id, paypal-id, ...)
    --       or inline-json without separate table?

    -- type of the order like, top up, buy beer,
    order_type text not null references order_type(name),
    cancels_order bigint references ordr(id),
    constraint only_cancel_orders_can_reference_orders check((order_type != 'cancel_sale') = (cancels_order is null)),

    -- who created it
    cashier_id bigint not null references usr(id),
    till_id bigint not null references till(id),
    -- customer is allowed to be null, as it is only known on the final booking, not on the creation of the order
    -- canceled orders can have no customer
    customer_account_id bigint references account(id)
);

-- all products in a transaction
create table if not exists line_item (
    order_id bigint not null references ordr(id),
    item_id bigint not null,
    primary key (order_id, item_id),

    product_id bigint not null references product(id),
    -- current product price
    product_price numeric not null,

    quantity bigint not null default 1,
    constraint quantity_not_zero check ( quantity != 0 ),

    -- tax amount
    tax_name text,
    tax_rate numeric,
    total_price numeric generated always as ( product_price * quantity ) stored,
    total_tax numeric generated always as (
        round(product_price * quantity * tax_rate / (1 + tax_rate ), 2)
    ) stored

    -- TODO: constrain that we can only reference locked products
    -- TODO: constrain that only returnable products lead to a non zero quantity here
);

create or replace view line_item_json as (
    select
        l.*,
        row_to_json(p) as product
    from line_item as l
        join product_with_tax_and_restrictions p on l.product_id = p.id
);

create or replace function new_order_added() returns trigger as
$$
begin
    if NEW is null then
        return null;
    end if;

    -- insert a new tse signing request and notify for it
    insert into bon(id) values (NEW.id);
    perform pg_notify('bon', NEW.id::text);

    -- send general notifications, used e.g. for instant UI updates
    perform pg_notify(
        'order',
        json_build_object(
            'order_id', NEW.id,
            'order_uuid', NEW.uuid,
            'cashier_id', NEW.cashier_id,
            'till_id', NEW.till_id
        )::text
    );

    return NEW;
end;
$$ language plpgsql;

drop trigger if exists new_order_trigger on ordr;
create trigger new_order_trigger
    after insert
    on ordr
    for each row
execute function new_order_added();

-- aggregates the line_item's amounts
create or replace view order_value as
    select
        ordr.*,
        sum(total_price) as total_price,
        sum(total_tax) as total_tax,
        sum(total_price - total_tax) as total_no_tax,
        json_agg(line_item_json) as line_items
    from
        ordr
        left join line_item_json
            on (ordr.id = line_item_json.order_id)
    group by
        ordr.id;

-- show all line items
create or replace view order_items as
    select
        ordr.*,
        line_item.*
    from
        ordr
        left join line_item
            on (ordr.id = line_item.order_id);

-- aggregated tax rate of items
create or replace view order_tax_rates as
    select
        ordr.*,
        tax_name,
        tax_rate,
        sum(total_price) as total_price,
        sum(total_tax) as total_tax,
        sum(total_price - total_tax) as total_no_tax
    from
        ordr
        left join line_item
            on (ordr.id = order_id)
        group by
            ordr.id, tax_rate, tax_name;


create table if not exists transaction (
    -- represents a transaction of one account to another
    -- one order can consist of multiple transactions, hence the extra table
    --      e.g. wares to the ware output account
    --      and deposit to a specific deposit account
    id bigint primary key generated always as identity,
    order_id bigint references ordr(id),

    -- what was booked in this transaction  (backpack, items, ...)
    description text,

    source_account bigint not null references account(id),
    target_account bigint not null references account(id),
    constraint source_target_account_different check (source_account != target_account),

    booked_at timestamptz not null default now(),

    -- amount being transferred from source_account to target_account
    amount numeric not null,
    constraint amount_positive check (amount >= 0),
    vouchers bigint not null,
    constraint vouchers_positive check (vouchers >= 0)
);

create table if not exists cashier_shift (
    id bigint primary key generated always as identity,
    -- TODO: constraint that we can only reference users with a cashier account id
    cashier_id bigint references usr(id),
    started_at timestamptz not null,
    ended_at timestamptz not null,
    final_cash_drawer_balance numeric not null,
    final_cash_drawer_imbalance numeric not null,
    comment text not null,
    close_out_transaction_id bigint not null references transaction(id)
);

create or replace view cashier as (
    select
        usr.id,
        usr.login,
        usr.display_name,
        usr.description,
        usr.user_tag_uid,
        usr.transport_account_id,
        usr.cashier_account_id,
        a.balance as cash_drawer_balance,
        t.id as till_id
    from usr
    join account a on usr.cashier_account_id = a.id
    left join till t on t.active_user_id = usr.id
);


-- book a new transaction and update the account balances automatically, returns the new transaction_id
create or replace function book_transaction (
    order_id bigint,
    description text,
    source_account_id bigint,
    target_account_id bigint,
    amount numeric,
    vouchers_amount bigint,
    booked_at timestamptz default now()
)
    returns bigint as $$
<<locals>> declare
    transaction_id bigint;
    temp_account_id bigint;
begin
    if vouchers_amount * amount < 0 then
        raise 'vouchers_amount and amount must have the same sign';
    end if;

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
        order_id, description, source_account, target_account, amount, vouchers, booked_at
    )
    values (
        book_transaction.order_id,
        book_transaction.description,
        book_transaction.source_account_id,
        book_transaction.target_account_id,
        book_transaction.amount,
        book_transaction.vouchers_amount,
        book_transaction.booked_at
    ) returning id into locals.transaction_id;

    -- update account values
    update account set
        balance = balance - amount,
        vouchers = vouchers - vouchers_amount
        where id = source_account_id;
    update account set
        balance = balance + amount,
        vouchers = vouchers + vouchers_amount
        where id = target_account_id;

    return locals.transaction_id;

end;
$$ language plpgsql;


-- requests the tse module to sign something
create table if not exists tse_signature (
    id bigint primary key references ordr(id),

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
    id bigint not null primary key references ordr(id),

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
