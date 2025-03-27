-- migration: e2c67010
-- requires: 4e2c75a7

-- create table if not exists presale_account (
--     id   bigint primary key generated always as identity,
--     node_id bigint references node(id) not null,
--     email text primary key unique, -- this should be the primary key

--     payed boolean not null default false,
--     -- reference to the payment
--     -- signed qr code content
--     -- login token for customer portal
--     name text not null,

--     amount_purchased numeric not null, -- can be updated with there is another purchase

--     customer_account_id bigint references account (id) on delete cascade,
-- );



create table if not exists presale_info (
    presale_account_id bigint primary key references account (id),
    presale_checkout_id bigint references presale_sumup_checkout (id) on delete cascade,
    login_token uuid unique not null,
);

-- gestaffelter vorverkauf preis

-- ich bestaeige dass ich und alle fuer die ich tickets kaufe mindestens 18 jahre alt sind
-- andere tickets muessen vonort gekauft werden




-- presale checkout
create table if not exists presale_sumup_checkout (
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
    node_id bigint references node(id) not null,
    email text not null,
    ticket_id bigint references product_ticket_metadata (id) not null
    -- presale_account_id bigint references presale_account (id) on delete cascade
);

-- in den simulator

-- should we do this with date somehow
alter table product_ticket_metadata add column presale boolean default false not null;


-- verkauftes ticket

-- alter table product_ticket_metadata add column presale bigint references presale_account (id) on delete cascade;
