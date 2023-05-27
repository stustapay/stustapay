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
    -- Must conform to ISO 4217 for SEPA transfer
    ('currency.identifier', 'EUR'),
    ('max_account_balance', '150')
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

    comment text,

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

create or replace function check_account_balance() returns trigger as
$$
<<locals>> declare
    new_balance numeric;
    max_balance numeric;
begin
    select value::numeric into locals.max_balance from config where key = 'max_account_balance';

    -- Since this constraint function runs at the end of a db transaction we need to fetch the current balance
    -- from the table manually. If we were to use NEW.balance we'd still have the old balance at the time of
    -- the insert / update.
    select balance into locals.new_balance from account where id = NEW.id;

    if NEW.type = 'private' and locals.new_balance > locals.max_balance then
        raise 'Customers can have a maximum balance of at most %. New balance would be %.',
            locals.max_balance, locals.new_balance;
    end if;

    if NEW.type = 'private' and locals.new_balance < 0 then
        raise 'Customers cannot have a negative balance. New balance would be %.', locals.new_balance;
    end if;

    return NEW;
end
$$ language plpgsql;

-- bookkeeping account
create table if not exists account (
    id bigint primary key generated always as identity (start with 1000),
    user_tag_uid numeric(20) unique references user_tag(uid),
    type text not null references account_type(name),
    name text,
    comment text,

    -- current balance, updated on each transaction
    balance numeric not null default 0,
    -- current number of vouchers, updated on each transaction
    vouchers bigint not null default 0

    -- todo: topup-config
);

-- we need to use a constraint trigger for the balance check as normal table level check constraints do not support
-- the deferrable initially deferred setting
create constraint trigger max_balance_limited
 after insert or update on account
 deferrable initially deferred
 for each row execute function check_account_balance();

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
    (7, null, 'virtual', 'Cash Exit', 'target account when cash exists the system, e.g. cash pay outs'),
    (8, null, 'virtual', 'Cash Sale Source', 'source account for cash good sales or cash top ups')
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

drop trigger if exists update_tag_association_history_trigger on account;
create trigger update_tag_association_history_trigger
    after update of user_tag_uid on account
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid and OLD.user_tag_uid is not null)
    execute function update_tag_association_history();

create or replace view account_with_history as (
    select
        a.*,
        ut.comment as user_tag_comment,
        ut.restriction,
        coalesce(hist.tag_history, '[]'::json) as tag_history
    from account a
    left join user_tag ut on a.user_tag_uid = ut.uid
    left join (
        select
            atah.account_id,
            json_agg(json_build_object(
                'account_id', atah.account_id,
                'user_tag_uid', atah.user_tag_uid,
                'mapping_was_valid_until', atah.mapping_was_valid_until,
                'comment', ut.comment
            )) as tag_history
        from account_tag_association_history atah
        join user_tag ut on atah.user_tag_uid = ut.uid
        group by atah.account_id
    ) hist on a.id = hist.account_id
);

create or replace view user_tag_with_history as (
    select
        ut.uid as user_tag_uid,
        ut.comment,
        a.id as account_id,
        coalesce(hist.account_history, '[]'::json) as account_history
    from user_tag ut
    left join account a on a.user_tag_uid = ut.uid
    left join (
        select
            atah.user_tag_uid,
            json_agg(json_build_object(
                'account_id', atah.account_id,
                'mapping_was_valid_until', atah.mapping_was_valid_until,
                'comment', ut.comment
            )) as account_history
        from account_tag_association_history atah
        join user_tag ut on atah.user_tag_uid = ut.uid
        group by atah.user_tag_uid
    ) hist on ut.uid = hist.user_tag_uid
);

create table if not exists cash_register (
    id bigint primary key generated always as identity,
    name text not null
);

-- customer iban bank accounts
create table if not exists customer_info (
    customer_account_id bigint primary key references account(id),
    iban text,
    account_name text,
    email text
);

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
    cashier_account_id bigint references account(id),
    cash_register_id bigint references cash_register(id) unique,
    created_by bigint references usr(id),
    constraint cash_register_need_cashier_acccount
        check (((cash_register_id is not null) and (cashier_account_id is not null)) or cash_register_id is null),
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
    ('account_management'),
    ('cashier_management'),
    ('config_management'),
    ('product_management'),
    ('tax_rate_management'),
    ('user_management'),
    ('till_management'),
    ('order_management'),
    ('festival_overview'),

    -- festival workflow privileges
    ('terminal_login'),
    ('supervised_terminal_login'),

    -- festival order / ticket / voucher flow privileges
    -- which orders are available (sale, ticket, ...) is determined by the terminal profile
    ('can_book_orders'),
    ('grant_free_tickets'),
    ('grant_vouchers')
    on conflict do nothing;

create table if not exists user_role (
    id bigint primary key generated always as identity (start with 1000),
    is_privileged boolean not null default false,
    name text not null unique
);

create table if not exists user_to_role (
    user_id bigint not null references usr(id) on delete cascade,
    role_id bigint not null references user_role(id),
    primary key (user_id, role_id)
);

create or replace function user_to_role_updated() returns trigger as
$$
<<locals>> declare
    role_name text;
    user_login text;
    cashier_account_id bigint;
    transport_account_id bigint;
begin
    select name into locals.role_name from user_role where id = NEW.role_id;

    select
        usr.cashier_account_id,
        usr.transport_account_id,
        usr.login
        into locals.cashier_account_id, locals.transport_account_id, locals.user_login
    from usr where id = NEW.user_id;

    if locals.role_name = 'cashier' then
        if locals.cashier_account_id is null then
            insert into account (type, name)
            values ('internal', 'cashier account for ' || locals.user_login)
            returning id into locals.cashier_account_id;

            update usr set cashier_account_id = locals.cashier_account_id where id = NEW.user_id;
        end if;
    end if;
    if locals.role_name = 'finanzorga' then
        if locals.transport_account_id is null then
            insert into account (type, name)
            values ('internal', 'transport account for ' || locals.user_login)
            returning id into locals.transport_account_id;

            update usr set transport_account_id = locals.transport_account_id where id = NEW.user_id;
        end if;
    end if;

    return NEW;
end
$$ language plpgsql;


drop trigger if exists user_to_role_updated_trigger on user_to_role;
create trigger user_to_role_updated_trigger
    after insert on user_to_role
    for each row
execute function user_to_role_updated();

create table if not exists user_role_to_privilege (
    role_id bigint not null references user_role(id) on delete cascade,
    privilege text not null references privilege(name),
    primary key (role_id, privilege)
);

insert into user_role (
    id, name, is_privileged
) overriding system value
values
    (0, 'admin', true),
    (1, 'finanzorga', true),
    (2, 'cashier', false),
    (3, 'standleiter', false),
    (4, 'infozelt helfer', false)
on conflict do nothing;

insert into user_role_to_privilege (
    role_id, privilege
)
values
    -- admin
    (0, 'account_management'),
    (0, 'cashier_management'),
    (0, 'config_management'),
    (0, 'product_management'),
    (0, 'tax_rate_management'),
    (0, 'user_management'),
    (0, 'till_management'),
    (0, 'order_management'),
    (0, 'festival_overview'),
    (0, 'terminal_login'),
    (0, 'grant_free_tickets'),
    (0, 'grant_vouchers'),
    -- finanzorga
    (1, 'account_management'),
    (1, 'cashier_management'),
    (1, 'product_management'),
    (1, 'user_management'),
    (1, 'till_management'),
    (1, 'order_management'),
    (1, 'festival_overview'),
    (1, 'terminal_login'),
    (1, 'grant_free_tickets'),
    (1, 'grant_vouchers'),
    -- cashier
    (2, 'supervised_terminal_login'),
    (2, 'can_book_orders'),
    -- standleiter
    (3, 'terminal_login'),
    (3, 'grant_vouchers'),
    -- infozelt helfer
    (4, 'supervised_terminal_login'),
    (4, 'grant_free_tickets'),
    (4, 'grant_vouchers')
    on conflict do nothing;

create or replace view user_role_with_privileges as (
    select
        r.*,
        coalesce(privs.privileges, '{}'::text array) as privileges
    from user_role r
    left join (
        select ur.role_id, array_agg(ur.privilege) as privileges
        from user_role_to_privilege ur
        group by ur.role_id
    ) privs on r.id = privs.role_id
);

create or replace view user_with_roles as (
    select
        usr.*,
        coalesce(roles.roles, '{}'::text array) as role_names
    from usr
    left join (
        select utr.user_id as user_id, array_agg(ur.name) as roles
        from user_to_role utr
        join user_role ur on utr.role_id = ur.id
        group by utr.user_id
    ) roles on usr.id = roles.user_id
);

create or replace view user_with_privileges as (
    select
        usr.*,
        coalesce(privs.privileges, '{}'::text array) as privileges
    from usr
    left join (
        select utr.user_id, array_agg(urtp.privilege) as privileges
        from user_to_role utr
        join user_role_to_privilege urtp on utr.role_id = urtp.role_id
        group by utr.user_id
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
    ('ticket'),
    ('money_transfer'),
    ('money_transfer_imbalance')
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
    ('transparent', 0.0, 'abgeführt über anderes Kassensystem')

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
    (4, 'Eintritt', true, 12, 'ust', true),
    (5, 'Eintritt U18', true, 12, 'ust', true),
    (6, 'Eintritt U16', true, 0, 'none', true),
    (7, 'Geldtransit', false, null, 'none', true),
    (8, 'DifferenzSollIst', false, null, 'none', true)
    on conflict do nothing;

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

create table if not exists ticket (
    id bigint primary key generated always as identity (start with 1000),
    name text not null unique,
    description text,
    product_id bigint not null references product(id),
    initial_top_up_amount numeric not null,
    restriction text references restriction_type(name),  -- todo: should we derive this from the product somehow??
    constraint initial_top_up_is_positive check (initial_top_up_amount >= 0)
    -- TODO: constraint that we can only reference locked, fixed-price products
);

create or replace view ticket_with_product as (
    select
        t.*,
        p.name as product_name,
        p.price,
        p.tax_name,
        p.tax_rate,
        p.target_account_id as product_target_account_id,
        t.initial_top_up_amount + p.price as total_price
    from ticket t
    join product_with_tax_and_restrictions p on t.product_id = p.id
);

create table if not exists till_layout (
    id bigint primary key generated always as identity (start with 1000),
    name text not null unique,
    description text
);

create table if not exists till_button (
    id bigint primary key generated always as identity (start with 1000),
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

create or replace function check_till_layout_contains_tickets_of_unique_restrictions(
    layout_id bigint,
    ticket_id bigint
) returns boolean as
$$
<<locals>> declare
    restriction_type text;
    n_current_tickets_in_layout int;
begin
    select t.restriction into locals.restriction_type
    from ticket t
    where t.id = check_till_layout_contains_tickets_of_unique_restrictions.ticket_id;

    select count(*) into locals.n_current_tickets_in_layout
    from ticket t
    join till_layout_to_ticket tltt on t.id = tltt.ticket_id
    where
        t.id != check_till_layout_contains_tickets_of_unique_restrictions.ticket_id
        and tltt.layout_id = check_till_layout_contains_tickets_of_unique_restrictions.layout_id
        and (t.restriction = locals.restriction_type or t.restriction is null and locals.restriction_type is null);

    return locals.n_current_tickets_in_layout < 1;
end
$$ language plpgsql;

create table if not exists till_layout_to_ticket (
    layout_id bigint not null references till_layout(id) on delete cascade,
    ticket_id bigint not null references ticket(id),
    sequence_number bigint not null,
    primary key (layout_id, ticket_id),
    unique (layout_id, ticket_id, sequence_number),

    constraint unique_restriction_ticket_per_layout
        check(check_till_layout_contains_tickets_of_unique_restrictions(layout_id, ticket_id))
);

create or replace view till_layout_with_buttons_and_tickets as (
    select
       t.*,
       coalesce(j_view.button_ids, '{}'::bigint array) as button_ids,
       coalesce(t_view.ticket_ids, '{}'::bigint array) as ticket_ids
    from till_layout t
    left join (
        select tltb.layout_id, array_agg(tltb.button_id order by tltb.sequence_number) as button_ids
        from till_layout_to_button tltb
        group by tltb.layout_id
    ) j_view on t.id = j_view.layout_id
    left join (
        select tltt.layout_id, array_agg(tltt.ticket_id order by tltt.sequence_number) as ticket_ids
        from till_layout_to_ticket tltt
        group by tltt.layout_id
    ) t_view on t.id = t_view.layout_id
);

create table if not exists till_profile (
    id bigint primary key generated always as identity (start with 1000),
    name text not null unique,
    description text,
    allow_top_up boolean not null default false,
    allow_cash_out boolean not null default false,
    allow_ticket_sale boolean not null default false,
    layout_id bigint not null references till_layout(id)
    -- todo: payment_methods?
);

create table if not exists allowed_user_roles_for_till_profile (
    profile_id bigint not null references till_profile(id) on delete cascade,
    role_id bigint not null references user_role(id),
    primary key (profile_id, role_id)
);

create or replace view till_profile_with_allowed_roles as (
    select
        p.*,
        coalesce(roles.role_ids, '{}'::bigint array) as allowed_role_ids,
        coalesce(roles.role_names, '{}'::text array) as allowed_role_names
    from till_profile p
    left join (
        select a.profile_id, array_agg(ur.id) as role_ids, array_agg(ur.name) as role_names
        from allowed_user_roles_for_till_profile a
        join user_role ur on a.role_id = ur.id
        group by a.profile_id
    ) roles on roles.profile_id = p.id
);

create table if not exists cash_register_stocking (
    id bigint primary key generated always as identity,
    name text not null,
    euro200 bigint not null default 0,
    euro100 bigint not null default 0,
    euro50 bigint not null default 0,
    euro20 bigint not null default 0,
    euro10 bigint not null default 0,
    euro5 bigint not null default 0,
    euro2 bigint not null default 0,
    euro1 bigint not null default 0,
    cent50 bigint not null default 0,
    cent20 bigint not null default 0,
    cent10 bigint not null default 0,
    cent5 bigint not null default 0,
    cent2 bigint not null default 0,
    cent1 bigint not null default 0,
    variable_in_euro numeric not null default 0,
    total numeric generated always as (
        euro200 * 200.0 +
        euro100 * 100.0 +
        euro50 * 50.0 +
        euro20 * 20.0 +
        euro10 * 10.0 +
        euro5 * 5.0 +
        euro2 * 50.0 +
        euro1 * 25.0 +
        cent50 * 20.0 +
        cent20 * 8.0 +
        cent10 * 4.0 +
        cent5 * 2.5 +
        cent2 * 1.0 +
        cent1 * 0.5 +
        variable_in_euro
    ) stored,
    constraint non_negative_stockings check
        (euro200 >= 0 and
         euro100 >= 0 and
         euro50 >= 0 and
         euro20 >= 0 and
         euro10 >= 0 and
         euro5 >= 0 and
         euro2 >= 0 and
         euro1 >= 0 and
         cent50 >= 0 and
         cent20 >= 0 and
         cent10 >= 0 and
         cent5 >= 0 and
         cent2 >= 0 and
         cent1 >= 0 and
         variable_in_euro >= 0)
);
comment on column cash_register_stocking.euro2 is 'number of rolls, one roll = 25 pcs = 50€';
comment on column cash_register_stocking.euro1 is 'number of rolls, one roll = 25 pcs = 25€';
comment on column cash_register_stocking.cent50 is 'number of rolls, one roll = 40 pcs = 20€';
comment on column cash_register_stocking.cent20 is 'number of rolls, one roll = 40 pcs = 8€';
comment on column cash_register_stocking.cent10 is 'number of rolls, one roll = 40 pcs = 4€';
comment on column cash_register_stocking.cent5 is 'number of rolls, one roll = 50 pcs = 2,50€';
comment on column cash_register_stocking.cent2 is 'number of rolls, one roll = 50 pcs = 1€';
comment on column cash_register_stocking.cent1 is 'number of rolls, one roll = 50 pcs = 0,50€';


do $$ begin
    create type tse_status_enum as enum ('new', 'active', 'disabled', 'failed');
exception
    when duplicate_object then null;
end $$;

create table if not exists tse_status_info (
    enum_value tse_status_enum primary key,
    name text not null,
    description text not null
);


insert into tse_status_info (enum_value, name, description) values
    ('new', 'new', 'TSE is newly added'),
    ('active', 'active', 'TSE is active and in use'),
    ('disabled', 'disabled', 'TSE is diabled/no longer in use'),
    ('failed', 'failed', 'TSE Failed') on conflict do nothing;


-- list of TSEs with static TSE info
create table if not exists tse (
    tse_id                    bigint primary key generated always as identity,
    tse_name                  text unique not null,
    tse_status                tse_status_enum not null default 'new',
    tse_serial                text,
    tse_hashalgo              text,
    tse_time_format           text,
    tse_public_key            text,
    tse_certificate           text,
    tse_process_data_encoding text
);



-- which cash desks do we have and in which state are they
create table if not exists till (
    id bigint primary key generated always as identity (start with 1000),
    name text not null unique,
    description text,
    registration_uuid uuid unique,
    session_uuid uuid unique,

    -- how this till is currently mapped to a tse
    tse_id bigint references tse(tse_id),

    -- identifies the current active work shift and configuration
    active_shift text,
    active_profile_id bigint not null references till_profile(id),
    active_user_id bigint references usr(id),
    active_user_role_id bigint references user_role(id),
    active_cash_register_id bigint references cash_register(id) unique,
    constraint user_requires_role check ((active_user_id is null) = (active_user_role_id is null)),

    -- kassenschlussnummer für tse, incremented after every login
    z_nr bigint not null default 1,

    constraint registration_or_session_uuid_null check ((registration_uuid is null) != (session_uuid is null)),
    constraint virtual_till_cannot_be_registered check ((id = 1 and session_uuid is null) or id != 1)
);

create or replace view till_with_cash_register as (
    select
        t.*,
        tse.tse_serial,
        cr.name as current_cash_register_name,
        a.balance as current_cash_register_balance
    from till t
    left join usr u on t.active_user_id = u.id
    left join account a on u.cashier_account_id = a.id
    left join cash_register cr on t.active_cash_register_id = cr.id
    left join tse on tse.tse_id = t.tse_id
);

create or replace view cash_register_with_cashier as (
    select
        c.*,
        t.id as current_till_id,
        u.id as current_cashier_id,
        coalesce(a.balance, 0) as current_balance
    from cash_register c
    left join usr u on u.cash_register_id = c.id
    left join account a on a.id = u.cashier_account_id
    left join till t on t.active_cash_register_id = c.id
);

insert into till_layout (
    id, name, description
) overriding system value
values
    (1, 'Virtual Till Layout', '')
    on conflict do nothing;

insert into till_profile (
    id, name, description, allow_top_up, allow_cash_out, allow_ticket_sale, layout_id
) overriding system value
values
    (1, 'Virtual till profile', '', false, false, false, 1)
    on conflict do nothing;
insert into till (
    id, name, description, active_profile_id, registration_uuid, tse_id
) overriding system value
values
    (1, 'Virtual Till', '', 1, gen_random_uuid(), null)
    on conflict do nothing;


create or replace function handle_till_user_login() returns trigger as
$$
<<locals>> declare
    old_cashier_account_id bigint;
    old_cash_register_id bigint;
    old_cash_register_balance numeric;
    old_order_id bigint;

    n_orders_booked bigint;

    new_cashier_account_id bigint;
    new_cash_register_id bigint;
    new_cash_register_balance numeric;
    new_order_id bigint;
begin
    NEW.active_cash_register_id := null;

    if NEW.active_user_id is not null then
        select usr.cash_register_id, usr.cashier_account_id, a.balance
        into locals.new_cash_register_id, locals.new_cashier_account_id, locals.new_cash_register_balance
        from usr
                 join account a on usr.cashier_account_id = a.id
        where usr.id = NEW.active_user_id;

        select count(*) into locals.n_orders_booked from ordr where z_nr = NEW.z_nr and till_id = NEW.id;

        if locals.n_orders_booked > 0 then
            NEW.z_nr := NEW.z_nr + 1;
        end if;

        if locals.new_cash_register_id is not null then
            insert into ordr (item_count, payment_method, order_type, cashier_id, till_id, cash_register_id, z_nr)
            values (1, 'cash', 'money_transfer', NEW.active_user_id, NEW.id, locals.new_cash_register_id, NEW.z_nr)
            returning id into locals.new_order_id;

            insert into line_item (order_id, item_id, product_id, product_price, quantity, tax_name, tax_rate)
            values
                (locals.new_order_id, 0, 7, locals.new_cash_register_balance, 1, 'none', 0);
            NEW.active_cash_register_id := locals.new_cash_register_id;
        end if;
    end if;

    if OLD.active_user_id is not null then
        select usr.cash_register_id, usr.cashier_account_id, a.balance
        into locals.old_cash_register_id, locals.old_cashier_account_id, locals.old_cash_register_balance
        from usr
                 join account a on usr.cashier_account_id = a.id
        where usr.id = OLD.active_user_id;

        if locals.old_cash_register_id is not null and locals.old_cash_register_balance != 0 then
            insert into ordr (item_count, payment_method, order_type, cashier_id, till_id, cash_register_id, z_nr)
            values (1, 'cash', 'money_transfer', OLD.active_user_id, OLD.id, locals.old_cash_register_id, OLD.z_nr)
            returning id into locals.old_order_id;

            insert into line_item (order_id, item_id, product_id, product_price, quantity, tax_name, tax_rate)
            values
                (locals.old_order_id, 0, 7, -locals.old_cash_register_balance, 1, 'none', 0);
        end if;
    end if;

    return NEW;
end
$$ language plpgsql;


drop trigger if exists handle_till_user_login_trigger on till;
create trigger handle_till_user_login_trigger
    before update of active_user_id on till
    for each row
    when (OLD.active_user_id is distinct from NEW.active_user_id)
execute function handle_till_user_login();

do $$ begin
    create type till_tse_history_type as enum ('register', 'deregister');
exception
    when duplicate_object then null;
end $$;

-- logs all historic till <-> TSE assignments (as registered with the TSE)
create table if not exists till_tse_history (
    till_id text not null,
    tse_id bigint references tse(tse_id) not null,
    what till_tse_history_type not null,
    z_nr bigint not null,
    date timestamptz not null default now()
);


create or replace function deny_in_trigger() returns trigger language plpgsql as
$$
begin
    return null;
end;
$$;


drop trigger if exists till_tse_history_deny_update_delete on till_tse_history;
create trigger till_tse_history_deny_update_delete
before update or delete on till_tse_history
for each row execute function deny_in_trigger();

-- represents an order of an customer, like buying wares or top up
create table if not exists ordr (
    id bigint primary key generated always as identity,
    uuid uuid not null default gen_random_uuid() unique,

    -- order values can be obtained with order_value

    -- how many line items does this transaction have
    -- determines the next line_item id
    item_count bigint not null default 0,

    booked_at timestamptz not null default now(),

    -- how the order was invoked
    payment_method text not null references payment_method(name),
    -- todo: method_info references payment_information(id) -> (sumup-id, paypal-id, ...)
    --       or inline-json without separate table?

    -- kassenschlussnummer für tse
    z_nr bigint not null,

    -- type of the order like, top up, buy beer,
    order_type text not null references order_type(name),
    cancels_order bigint references ordr(id) unique,
    constraint only_cancel_orders_can_reference_orders check((order_type != 'cancel_sale') = (cancels_order is null)),

    -- who created it
    cashier_id bigint not null references usr(id),
    cash_register_id bigint references cash_register(id),
    constraint cash_orders_need_cash_register
        check ((payment_method = 'cash' and cash_register_id is not null) or (payment_method != 'cash' and cash_register_id is null)),
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
    insert into tse_signature(id) values (NEW.id);
    perform pg_notify('tse_signature', NEW.id::text);

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

create or replace view line_item_aggregated_json as (
    select
        order_id,
        sum(total_price) as total_price,
        sum(total_tax) as total_tax,
        sum(total_price - total_tax) as total_no_tax,
        coalesce(json_agg(line_item_json), json_build_array()) as line_items
    from line_item_json
    group by order_id
);

-- aggregates the line_item's amounts
create or replace view order_value as
    select
        ordr.*,
        a.user_tag_uid as customer_tag_uid,
        coalesce(li.total_price, 0) as total_price,
        coalesce(li.total_tax, 0) as total_tax,
        coalesce(li.total_no_tax, 0) as total_no_tax,
        coalesce(li.line_items, json_build_array()) as line_items
    from
        ordr
        left join line_item_aggregated_json li on ordr.id = li.order_id
        left join account a on ordr.customer_account_id = a.id;

-- aggregates account and customer_info to customer
create or replace view customer as
    select
        a.*,
        customer_info.*
    from
        account_with_history a
        left join customer_info
            on (a.id = customer_info.customer_account_id);

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

-- sql type function to the query planner can optimize it
create or replace function product_stats(
    from_timestamp timestamptz,
    to_timestamp timestamptz
)
returns table (
--     till_profile_id bigint,  -- does not make much sense as the profile could change
    till_id bigint,
    product_id bigint,
    quantity_sold bigint
) as $$
    select o.till_id, li.product_id, sum(li.quantity) as quantity_sold
    from line_item li
    join ordr o on li.order_id = o.id
    where o.order_type != 'cancel_order'
      and (from_timestamp is not null and o.booked_at >= from_timestamp or from_timestamp is null)
      and (to_timestamp is not null and o.booked_at <= to_timestamp or to_timestamp is null)
    group by o.till_id, li.product_id;
$$ language sql
    stable
    security invoker;

create table if not exists transaction (
    -- represents a transaction of one account to another
    -- one order can consist of multiple transactions, hence the extra table
    --      e.g. wares to the ware output account
    --      and deposit to a specific deposit account
    id bigint primary key generated always as identity,
    order_id bigint references ordr(id),
    -- for transactions without an associated order we want to track who caused this transaction
    conducting_user_id bigint references usr(id),
    constraint conducting_user_id_or_order_is_set check ((order_id is null) != (conducting_user_id is null)),

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

create or replace function voucher_stats(
    from_timestamp timestamptz,
    to_timestamp timestamptz
)
    returns table (
                      vouchers_issued bigint,
                      vouchers_spent bigint
                  ) as $$
select
    sum(case when t.source_account = 6 then t.vouchers else 0 end) as vouchers_issued,
    sum(case when t.source_account != 6 then t.vouchers else 0 end) as vouchers_spent
from transaction t
where
    (from_timestamp is not null and t.booked_at >= from_timestamp or from_timestamp is null)
  and (to_timestamp is not null and t.booked_at <= to_timestamp or to_timestamp is null);
$$ language sql
    stable
    security invoker;

create table if not exists cashier_shift (
    id bigint primary key generated always as identity,
    -- TODO: constraint that we can only reference users with a cashier account id
    cashier_id bigint references usr(id),
    closing_out_user_id bigint references usr(id),
    started_at timestamptz not null,
    ended_at timestamptz not null,
    actual_cash_drawer_balance numeric not null,
    expected_cash_drawer_balance numeric not null,
    cash_drawer_imbalance numeric generated always as
        ( actual_cash_drawer_balance - expected_cash_drawer_balance ) stored,
    comment text not null,
    close_out_order_id bigint not null references ordr(id) unique,
    close_out_imbalance_order_id bigint not null references ordr(id) unique
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
        usr.cash_register_id,
        a.balance as cash_drawer_balance,
        coalesce(tills.till_ids, '{}'::bigint array) as till_ids
    from usr
    join account a on usr.cashier_account_id = a.id
    left join (
        select t.active_user_id as user_id, array_agg(t.id) as till_ids
        from till t
        where t.active_user_id is not null
        group by t.active_user_id
    ) tills on tills.user_id = usr.id
);

-- book a new transaction and update the account balances automatically, returns the new transaction_id
create or replace function book_transaction (
    order_id bigint,
    description text,
    source_account_id bigint,
    target_account_id bigint,
    amount numeric,
    vouchers_amount bigint,
    booked_at timestamptz default now(),
    conducting_user_id bigint default null
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


do $$ begin
    create type tse_signature_status as enum ('new', 'pending', 'done', 'failure');
exception
    when duplicate_object then null;
end $$;

create table if not exists tse_signature_status_info (
    enum_value tse_signature_status primary key,
    name text not null,
    description text not null
);

insert into tse_signature_status_info (enum_value, name, description) values
    ('new', 'new', 'Signature request is enqueued'),
    ('pending', 'pending', 'Signature is being created by TSE'),
    ('done', 'done', 'Signature was successful'),
    ('failure', 'failure', 'Failed to create signature') on conflict do nothing;


-- requests the tse module to sign something
create table if not exists tse_signature (
    id bigint primary key references ordr(id),

    signature_status tse_signature_status not null default 'new',
    -- TSE signature result message (error message or success message)
    result_message  text,
    constraint result_message_set check ((result_message is null) = (signature_status = 'new' or signature_status = 'pending')),

    created timestamptz not null default now(),
    last_update timestamptz not null default now(),

    -- id of the TSE that was used to create the signature
    tse_id          bigint references tse(tse_id),
    constraint tse_id_set check ((tse_id is null) = (signature_status = 'new')),

    -- signature input for the TSE
    transaction_process_type text,
    constraint transaction_process_type_set check ((transaction_process_type is not null) = (signature_status = 'done')),
    transaction_process_data text,
    constraint transaction_process_data_set check ((transaction_process_data is not null) = (signature_status = 'done')),

    -- signature data from the TSE
    tse_transaction text,
    constraint tse_transaction_set check ((tse_transaction is not null) = (signature_status = 'done')),
    tse_signaturenr text,
    constraint tse_signaturenr_set check ((tse_signaturenr is not null) = (signature_status = 'done')),
    tse_start       text,
    constraint tse_start_set check ((tse_start is not null) = (signature_status = 'done')),
    tse_end         text,
    constraint tse_end_set check ((tse_end is not null) = (signature_status = 'done')),
    tse_signature   text,
    constraint tse_signature_set check ((tse_signature is not null) = (signature_status = 'done')),
    tse_duration    float
);


-- partial index for only the unsigned rows in tse_signature
create index on tse_signature (id) where signature_status = 'new';
create index on tse_signature (id) where signature_status = 'pending';

create or replace function tse_signature_update_trigger_procedure()
returns trigger as $$
begin
    NEW.last_update = now();
    return NEW;
end;
$$ language plpgsql;


drop trigger if exists tse_signature_update_trigger on tse_signature;
create trigger tse_signature_update_trigger
    before update
    on tse_signature
    for each row
execute function tse_signature_update_trigger_procedure();

-- notify the bon generator about a new job
create or replace function tse_signature_finished_trigger_procedure()
returns trigger as $$
begin
  insert into bon(id) values (NEW.id);
  perform pg_notify('bon', json_build_object('bon_id', NEW.id)::text);

  return NEW;
end;
$$ language plpgsql;


drop trigger if exists tse_signature_finished_trigger on till;
create trigger tse_signature_finished_trigger
    after update of signature_status
    on tse_signature
    for each row
    when (NEW.signature_status = 'done' or NEW.signature_status = 'failure')
execute function tse_signature_finished_trigger_procedure();

-- requests the bon generator to create a new receipt
create table if not exists bon (
    id bigint not null primary key references ordr(id),

    generated bool default false,
    generated_at timestamptz,
    -- latex compile error
    error text,

    -- output file path
    output_file text
);

create or replace view order_value_with_bon as
    select
        o.*,
        b.generated as bon_generated,
        b.output_file as bon_output_file
    from order_value o
        left join bon b
            on (o.id = b.id);


-- wooh \o/
commit;
