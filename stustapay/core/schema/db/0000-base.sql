-- migration: 62df6b55
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
set plpgsql.extra_warnings to 'all';

-- general key-value config
create table if not exists config (
    key   text not null primary key,
    value text
);
insert into config (
    key, value
)
values
    -- event organizer name
    (
        'bon.issuer', 'der verein'
    ),
    -- event organizer address
    (
        'bon.addr', E'Müsterstraße 12\n12398 Test Stadt'
    ),
    -- title on top of the bon. This usually is the name of the event like StuStaCulum 2023
    (
        'bon.title', 'StuStaCulum 2023'
    ),
    -- json array. One of the strings is printed at the end of a bon
    (
        'bon.closing_texts', '["funny text 0", "funny text 1", "funny text 2", "funny text 3"]'
    ),

    -- Umsatzsteuer ID. Needed on each bon
    (
        'ust_id', 'DE123456789'
    ), (
    'currency.symbol', '€'
),
    -- Must conform to ISO 4217 for SEPA transfer
    (
        'currency.identifier', 'EUR'
    ), (
    'max_account_balance', '150'
), (
    'sumup_topup.enabled', 'true'
),

    -- Options for customer portal
    (
        'customer_portal.contact_email', 'test-beschwerde@stustapay.de'
    ), (
    'customer_portal.sepa.sender_name', 'Toller Festivalveranstalter'
), (
    'customer_portal.sepa.sender_iban', 'DE89 3704 0044 0532 0130 00'
),
    -- Verwendungszweck, {user_tag_uid} is replaced with the tag uid
    (
        'customer_portal.sepa.description', 'FestivalName, TagID: {user_tag_uid}'
    )
on conflict do nothing;


create table if not exists restriction_type (
    name text not null primary key
);
insert into restriction_type (
    name
)
values (
    'under_18'
), (
    'under_16'
)
on conflict do nothing;


-- some secret about one or many user_tags
create table if not exists user_tag_secret (
    id   bigint primary key generated always as identity,
    key0 bytea not null,
    key1 bytea not null
);


-- for wristbands/cards/...
create table if not exists user_tag (
    -- hardware id of the tag
    uid         numeric(20) primary key,
    -- printed on the back
    pin         text,
    -- custom serial number secretly stored on each chip
    serial      text,
    -- age restriction information
    restriction text references restriction_type (name),

    comment     text,

    -- to validate tag authenticity
    -- secret maybe shared with several tags.
    secret      bigint references user_tag_secret (id)
);


create table if not exists account_type (
    name text not null primary key
);
insert into account_type (
    name
)
values
    -- for entry/exit accounts
    (
        'virtual'
    ),

    -- for safe, backpack, ec, ...
    (
        'internal'
    ),

    -- the one you buy drinks with
    (
        'private'
    )

-- todo: cash_drawer, deposit,
on conflict do nothing;

-- bookkeeping account
create table if not exists account (
    id           bigint primary key generated always as identity (start with 1000),
    user_tag_uid numeric(20) unique references user_tag (uid),
    type         text    not null references account_type (name),
    name         text,
    comment      text,

    -- current balance, updated on each transaction
    balance      numeric not null default 0,
    -- current number of vouchers, updated on each transaction
    vouchers     bigint  not null default 0

    -- todo: topup-config
);

insert into account (
    id, user_tag_uid, type, name, comment
) overriding system value
values
    -- virtual accounts are hard coded with ids 0-99
    (
        0, null, 'virtual', 'Sale Exit', 'target account for sales of the system'
    ), (
    1, null, 'virtual', 'Cash Entry', 'source account, when cash is brought in the system (cash top_up, ...)'
), (
    2, null, 'virtual', 'Deposit', 'Deposit currently at the customers'
), (
    3, null, 'virtual', 'Sumup', 'source account for sumup top up '
), (
    4, null, 'virtual', 'Cash Vault', 'Main Cash tresor. At some point cash top up lands here'
), (
    5, null, 'virtual', 'Imbalace', 'Imbalance on a cash register on settlement'
), (
    6, null, 'virtual', 'Money / Voucher create',
    'Account which will be charged on manual account balance updates and voucher top ups'
), (
    7, null, 'virtual', 'Cash Exit', 'target account when cash exists the system, e.g. cash pay outs'
), (
    8, null, 'virtual', 'Cash Sale Source', 'source account for cash good sales or cash top ups'
), (
    9, null, 'virtual', 'Sumup customer topup', 'source account for sumup top ups through the customer portal'
)
on conflict do nothing;

create table if not exists account_tag_association_history (
    account_id              bigint      not null references account (id),
    user_tag_uid            numeric(20) references user_tag (uid),
    mapping_was_valid_until timestamptz not null default now(),
    primary key (account_id, user_tag_uid, mapping_was_valid_until)
);

create table if not exists cash_register (
    id   bigint primary key generated always as identity,
    name text not null
);

-- customer iban bank accounts
create table if not exists customer_info (
    customer_account_id bigint primary key references account (id),
    iban                text,
    account_name        text,
    email               text
);

-- customer checkout
create table if not exists customer_sumup_checkout (
    checkout_reference  uuid primary key unique,
    amount              numeric     not null,
    currency            text        not null,        -- currency identifier -> EUR
    merchant_code       text        not null,
    description         text        not null,
    return_url          text        not null,
    id                  text        not null unique, -- sumup checkout id
    status              text        not null,
    date                timestamptz not null,
    valid_until         timestamptz,
    customer_account_id bigint references account (id) on delete cascade
);

-- people working with the payment system
create table if not exists usr (
    id                   bigint primary key generated always as identity,

    login                text not null unique,
    password             text,

    display_name         text not null default '',
    description          text,

    user_tag_uid         numeric(20) unique references user_tag (uid) on delete restrict,

    -- depending on the transfer action, the correct account is booked
    transport_account_id bigint references account (id),
    cashier_account_id   bigint references account (id),
    cash_register_id     bigint references cash_register (id) unique,
    created_by           bigint references usr (id)
);
comment on column usr.transport_account_id is 'account for orgas to transport cash from one location to another';
comment on column usr.cashier_account_id is 'account for cashiers to store the current cash balance in input or output locations';

create table if not exists usr_session (
    id  bigint primary key generated always as identity,
    usr bigint not null references usr (id) on delete cascade
);

create table if not exists customer_session (
    id       bigint primary key generated always as identity,
    customer bigint not null references account (id) on delete cascade
);

create table if not exists privilege (
    name text not null primary key
);
insert into privilege (
    name
)
values (
    'account_management'
), (
    'cashier_management'
), (
    'config_management'
), (
    'product_management'
), (
    'tax_rate_management'
), (
    'user_management'
), (
    'till_management'
), (
    'order_management'
), (
    'festival_overview'
),

    -- festival workflow privileges
    (
        'terminal_login'
    ), (
    'supervised_terminal_login'
),

    -- festival order / ticket / voucher flow privileges
    -- which orders are available (sale, ticket, ...) is determined by the terminal profile
    (
        'can_book_orders'
    ), (
    'grant_free_tickets'
), (
    'grant_vouchers'
)
on conflict do nothing;

create table if not exists user_role (
    id            bigint primary key generated always as identity (start with 1000),
    is_privileged boolean not null default false,
    name          text    not null unique
);

create table if not exists user_to_role (
    user_id bigint not null references usr (id) on delete cascade,
    role_id bigint not null references user_role (id),
    primary key (user_id, role_id)
);

create table if not exists user_role_to_privilege (
    role_id   bigint not null references user_role (id) on delete cascade,
    privilege text   not null references privilege (name),
    primary key (role_id, privilege)
);

insert into user_role (
    id, name, is_privileged
) overriding system value
values (
    0, 'admin', true
), (
    1, 'finanzorga', true
), (
    2, 'cashier', false
), (
    3, 'standleiter', false
), (
    4, 'infozelt helfer', false
)
on conflict do nothing;

insert into user_role_to_privilege (
    role_id, privilege
)
values
    -- admin
    (
        0, 'account_management'
    ), (
    0, 'cashier_management'
), (
    0, 'config_management'
), (
    0, 'product_management'
), (
    0, 'tax_rate_management'
), (
    0, 'user_management'
), (
    0, 'till_management'
), (
    0, 'order_management'
), (
    0, 'festival_overview'
), (
    0, 'terminal_login'
), (
    0, 'grant_free_tickets'
), (
    0, 'grant_vouchers'
),
    -- finanzorga
    (
        1, 'account_management'
    ), (
    1, 'cashier_management'
), (
    1, 'product_management'
), (
    1, 'user_management'
), (
    1, 'till_management'
), (
    1, 'order_management'
), (
    1, 'festival_overview'
), (
    1, 'terminal_login'
), (
    1, 'grant_free_tickets'
), (
    1, 'grant_vouchers'
),
    -- cashier
    (
        2, 'supervised_terminal_login'
    ), (
    2, 'can_book_orders'
),
    -- standleiter
    (
        3, 'terminal_login'
    ), (
    3, 'grant_vouchers'
),
    -- infozelt helfer
    (
        4, 'supervised_terminal_login'
    ), (
    4, 'grant_free_tickets'
), (
    4, 'grant_vouchers'
)
on conflict do nothing;

create table if not exists payment_method (
    name text not null primary key
);
insert into payment_method (
    name
)
values
    -- when topping up with cash
    (
        'cash'
    ),
    -- when topping up with sumup
    (
        'sumup'
    ),
    -- payment with tag
    (
        'tag'
    ),
    -- sumup online topup
    (
        'sumup_online'
    )

-- todo: paypal

on conflict do nothing;

create table if not exists order_type (
    name text not null primary key
);
insert into order_type (
    name
)
values
    -- top up customer account
    (
        'top_up'
    ),
    -- buy items to consume
    (
        'sale'
    ),
    -- cancel a sale
    (
        'cancel_sale'
    ),
    -- pay out remaining balance on a tag
    (
        'pay_out'
    ),
    -- sale of a ticket in combination with an initial top up
    (
        'ticket'
    ), (
    'money_transfer'
), (
    'money_transfer_imbalance'
)
on conflict do nothing;

create table if not exists tax (
    name        text    not null primary key,
    rate        numeric not null,
    description text    not null
);
insert into tax (
    name, rate, description
)
values
    -- for internal transfers, THIS LINE MUST NOT BE DELETED, EVEN BY AN ADMIN
    (
        'none', 0.0, 'keine Steuer'
    ),
    -- reduced sales tax for food etc
    -- ermäßigte umsatzsteuer in deutschland
    (
        'eust', 0.07, 'ermäßigte Umsatzsteuer'
    ),
    -- normal sales tax
    -- umsatzsteuer in deutschland
    (
        'ust', 0.19, 'normale Umsatzsteuer'
    ),
    -- no tax, when we're the payment system of another legal entity.
    (
        'transparent', 0.0, 'abgeführt über anderes Kassensystem'
    )
on conflict do nothing;

create table if not exists product (
    id                bigint primary key generated always as identity (start with 1000),
    -- todo: ean or something for receipt?
    name              text    not null unique,

    price             numeric,
    fixed_price       boolean not null default true,
    price_in_vouchers bigint,                                                       -- will be null if this product cannot be bought with vouchers

    -- whether the core metadata of this product (price, price_in_vouchers, fixed_price, tax_name and target_account_id) is editable
    is_locked         bool    not null default false,

    -- whether or not this product
    is_returnable     bool    not null default false,

    -- if target account is set, the product is booked to this specific account,
    -- e.g. for the deposit account, or a specific exit account (for beer, ...)
    target_account_id bigint references account (id),

    tax_name          text    not null references tax (name)
);
comment on column product.price is 'price including tax (what is charged in the end)';
comment on column product.fixed_price is 'price is not fixed, e.g for top up. Then price=null and set with the api call';


insert into product (
    id, name, fixed_price, price, tax_name, is_locked
) overriding system value
values (
    1, 'Rabatt', false, null, 'none', true
), (
    2, 'Aufladen', false, null, 'none', true
), (
    3, 'Auszahlen', false, null, 'none', true
), (
    4, 'Eintritt', true, 12, 'ust', true
), (
    5, 'Eintritt U18', true, 12, 'ust', true
), (
    6, 'Eintritt U16', true, 0, 'none', true
), (
    7, 'Geldtransit', false, null, 'none', true
), (
    8, 'DifferenzSollIst', false, null, 'none', true
)
on conflict do nothing;

-- which products are not allowed to be bought with the user tag restriction (eg beer, below 16)
create table if not exists product_restriction (
    id          bigint not null references product (id) on delete cascade,
    restriction text   not null references restriction_type (name) on delete cascade,
    unique (id, restriction)
);

create table if not exists ticket (
    id                    bigint primary key generated always as identity (start with 1000),
    name                  text    not null unique,
    description           text,
    product_id            bigint  not null references product (id),
    initial_top_up_amount numeric not null,
    restriction           text references restriction_type (name) -- todo: should we derive this from the product somehow??
    -- TODO: constraint that we can only reference locked, fixed-price products
);

create table if not exists till_layout (
    id          bigint primary key generated always as identity (start with 1000),
    name        text not null unique,
    description text
);

create table if not exists till_button (
    id   bigint primary key generated always as identity (start with 1000),
    name text not null unique
);

create table if not exists till_button_product (
    button_id  bigint not null references till_button (id) on delete cascade,
    product_id bigint not null references product (id) on delete cascade,
    primary key (button_id, product_id)
);

create table if not exists till_layout_to_button (
    layout_id       bigint not null references till_layout (id) on delete cascade,
    button_id       bigint not null references till_button (id),
    sequence_number bigint not null,
    primary key (layout_id, button_id),
    unique (layout_id, button_id, sequence_number)
);

create table if not exists till_layout_to_ticket (
    layout_id       bigint not null references till_layout (id) on delete cascade,
    ticket_id       bigint not null references ticket (id),
    sequence_number bigint not null,
    primary key (layout_id, ticket_id),
    unique (layout_id, ticket_id, sequence_number)
);

create table if not exists till_profile (
    id                bigint primary key generated always as identity (start with 1000),
    name              text    not null unique,
    description       text,
    allow_top_up      boolean not null default false,
    allow_cash_out    boolean not null default false,
    allow_ticket_sale boolean not null default false,
    layout_id         bigint  not null references till_layout (id)
    -- todo: payment_methods?
);

create table if not exists allowed_user_roles_for_till_profile (
    profile_id bigint not null references till_profile (id) on delete cascade,
    role_id    bigint not null references user_role (id),
    primary key (profile_id, role_id)
);

create table if not exists cash_register_stocking (
    id               bigint primary key generated always as identity,
    name             text    not null,
    euro200          bigint  not null default 0,
    euro100          bigint  not null default 0,
    euro50           bigint  not null default 0,
    euro20           bigint  not null default 0,
    euro10           bigint  not null default 0,
    euro5            bigint  not null default 0,
    euro2            bigint  not null default 0,
    euro1            bigint  not null default 0,
    cent50           bigint  not null default 0,
    cent20           bigint  not null default 0,
    cent10           bigint  not null default 0,
    cent5            bigint  not null default 0,
    cent2            bigint  not null default 0,
    cent1            bigint  not null default 0,
    variable_in_euro numeric not null default 0,
    total            numeric generated always as ( euro200 * 200.0 + euro100 * 100.0 + euro50 * 50.0 + euro20 * 20.0 +
                                                   euro10 * 10.0 + euro5 * 5.0 + euro2 * 50.0 + euro1 * 25.0 +
                                                   cent50 * 20.0 + cent20 * 8.0 + cent10 * 4.0 + cent5 * 2.5 +
                                                   cent2 * 1.0 + cent1 * 0.5 + variable_in_euro ) stored
);
comment on column cash_register_stocking.euro2 is 'number of rolls, one roll = 25 pcs = 50€';
comment on column cash_register_stocking.euro1 is 'number of rolls, one roll = 25 pcs = 25€';
comment on column cash_register_stocking.cent50 is 'number of rolls, one roll = 40 pcs = 20€';
comment on column cash_register_stocking.cent20 is 'number of rolls, one roll = 40 pcs = 8€';
comment on column cash_register_stocking.cent10 is 'number of rolls, one roll = 40 pcs = 4€';
comment on column cash_register_stocking.cent5 is 'number of rolls, one roll = 50 pcs = 2,50€';
comment on column cash_register_stocking.cent2 is 'number of rolls, one roll = 50 pcs = 1€';
comment on column cash_register_stocking.cent1 is 'number of rolls, one roll = 50 pcs = 0,50€';

do
$$
    begin
        create type tse_status_enum as enum ('new', 'active', 'disabled', 'failed');
    exception
        when duplicate_object then null;
    end
$$;

create table if not exists tse_status_info (
    enum_value  tse_status_enum primary key,
    name        text not null,
    description text not null
);


insert into tse_status_info (
    enum_value, name, description
)
values (
    'new', 'new', 'TSE is newly added'
), (
    'active', 'active', 'TSE is active and in use'
), (
    'disabled', 'disabled', 'TSE is diabled/no longer in use'
), (
    'failed', 'failed', 'TSE Failed'
)
on conflict do nothing;


-- list of TSEs with static TSE info
create table if not exists tse (
    tse_id                    bigint primary key generated always as identity,
    tse_name                  text unique     not null,
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
    id                      bigint primary key generated always as identity (start with 1000),
    name                    text   not null unique,
    description             text,
    registration_uuid       uuid unique,
    session_uuid            uuid unique,

    -- how this till is currently mapped to a tse
    tse_id                  bigint references tse (tse_id),

    -- identifies the current active work shift and configuration
    active_shift            text,
    active_profile_id       bigint not null references till_profile (id),
    active_user_id          bigint references usr (id),
    active_user_role_id     bigint references user_role (id),
    active_cash_register_id bigint references cash_register (id) unique,

    -- kassenschlussnummer für tse, incremented after every login
    z_nr                    bigint not null default 1
);

insert into till_layout (
    id, name, description
) overriding system value
values (
    1, 'Virtual Till Layout', ''
)
on conflict do nothing;

insert into till_profile (
    id, name, description, allow_top_up, allow_cash_out, allow_ticket_sale, layout_id
) overriding system value
values (
    1, 'Virtual till profile', '', false, false, false, 1
)
on conflict do nothing;
insert into till (
    id, name, description, active_profile_id, registration_uuid, tse_id
) overriding system value
values (
    1, 'Virtual Till', '', 1, gen_random_uuid(), null
)
on conflict do nothing;

do
$$
    begin
        create type till_tse_history_type as enum ('register', 'deregister');
    exception
        when duplicate_object then null;
    end
$$;

-- logs all historic till <-> TSE assignments (as registered with the TSE)
create table if not exists till_tse_history (
    till_id text                           not null,
    tse_id  bigint references tse (tse_id) not null,
    what    till_tse_history_type          not null,
    z_nr    bigint                         not null,
    date    timestamptz                    not null default now()
);

-- represents an order of an customer, like buying wares or top up
create table if not exists ordr (
    id                  bigint primary key generated always as identity,
    uuid                uuid        not null default gen_random_uuid() unique,

    -- order values can be obtained with order_value

    -- how many line items does this transaction have
    -- determines the next line_item id
    item_count          bigint      not null default 0,

    booked_at           timestamptz not null default now(),

    -- how the order was invoked
    payment_method      text        not null references payment_method (name),
    -- todo: method_info references payment_information(id) -> (sumup-id, paypal-id, ...)
    --       or inline-json without separate table?

    -- kassenschlussnummer für tse
    z_nr                bigint      not null,

    -- type of the order like, top up, buy beer,
    order_type          text        not null references order_type (name),
    cancels_order       bigint references ordr (id) unique,

    -- who created it
    cashier_id          bigint references usr (id),
    cash_register_id    bigint references cash_register (id),
    till_id             bigint references till (id),

    -- customer is allowed to be null, as it is only known on the final booking, not on the creation of the order
    -- canceled orders can have no customer
    customer_account_id bigint references account (id)
);

-- all products in a transaction
create table if not exists line_item (
    order_id      bigint  not null references ordr (id),
    item_id       bigint  not null,
    primary key (order_id, item_id),

    product_id    bigint  not null references product (id),
    -- current product price
    product_price numeric not null,

    quantity      bigint  not null default 1,

    -- tax amount
    tax_name      text,
    tax_rate      numeric,
    total_price   numeric generated always as ( product_price * quantity ) stored,
    total_tax     numeric generated always as ( round(product_price * quantity * tax_rate / (1 + tax_rate), 2) ) stored

    -- TODO: constrain that we can only reference locked products
    -- TODO: constrain that only returnable products lead to a non zero quantity here
);

create table if not exists transaction (
    -- represents a transaction of one account to another
    -- one order can consist of multiple transactions, hence the extra table
    --      e.g. wares to the ware output account
    --      and deposit to a specific deposit account
    id                 bigint primary key generated always as identity,
    order_id           bigint references ordr (id),
    -- for transactions without an associated order we want to track who caused this transaction
    conducting_user_id bigint references usr (id),

    -- what was booked in this transaction  (backpack, items, ...)
    description        text,

    source_account     bigint      not null references account (id),
    target_account     bigint      not null references account (id),

    booked_at          timestamptz not null default now(),

    -- amount being transferred from source_account to target_account
    amount             numeric     not null,
    vouchers           bigint      not null
);

create table if not exists cashier_shift (
    id                           bigint primary key generated always as identity,
    -- TODO: constraint that we can only reference users with a cashier account id
    cashier_id                   bigint references usr (id),
    closing_out_user_id          bigint references usr (id),
    started_at                   timestamptz not null,
    ended_at                     timestamptz not null,
    actual_cash_drawer_balance   numeric     not null,
    expected_cash_drawer_balance numeric     not null,
    cash_drawer_imbalance        numeric generated always as ( actual_cash_drawer_balance - expected_cash_drawer_balance ) stored,
    comment                      text        not null,
    close_out_order_id           bigint      not null references ordr (id) unique,
    close_out_imbalance_order_id bigint      not null references ordr (id) unique
);

do
$$
    begin
        create type tse_signature_status as enum ('new', 'pending', 'done', 'failure');
    exception
        when duplicate_object then null;
    end
$$;

create table if not exists tse_signature_status_info (
    enum_value  tse_signature_status primary key,
    name        text not null,
    description text not null
);

insert into tse_signature_status_info (
    enum_value, name, description
)
values (
    'new', 'new', 'Signature request is enqueued'
), (
    'pending', 'pending', 'Signature is being created by TSE'
), (
    'done', 'done', 'Signature was successful'
), (
    'failure', 'failure', 'Failed to create signature'
)
on conflict do nothing;

-- requests the tse module to sign something
create table if not exists tse_signature (
    id                       bigint primary key references ordr (id),

    signature_status         tse_signature_status not null default 'new',
    -- TSE signature result message (error message or success message)
    result_message           text,

    created                  timestamptz          not null default now(),
    last_update              timestamptz          not null default now(),

    -- id of the TSE that was used to create the signature
    tse_id                   bigint references tse (tse_id),

    -- signature input for the TSE
    transaction_process_type text,
    transaction_process_data text,

    -- signature data from the TSE
    tse_transaction          text,
    tse_signaturenr          text,
    tse_start                text,
    tse_end                  text,
    tse_signature            text,
    tse_duration             float
);

-- partial index for only the unsigned rows in tse_signature
create index on tse_signature (id) where signature_status = 'new';
create index on tse_signature (id) where signature_status = 'pending';

-- requests the bon generator to create a new receipt
create table if not exists bon (
    id           bigint not null primary key references ordr (id),

    generated    bool default false,
    generated_at timestamptz,
    -- latex compile error
    error        text,

    -- output file path
    output_file  text
);

-- wooh \o/
