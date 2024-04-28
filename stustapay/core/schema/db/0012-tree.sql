-- revision: c66cbafc
-- requires: 2a15b453

alter table payout_run drop column execution_date;


do
$$
    begin
        create type tse_type as enum ('diebold_nixdorf');
    exception
        when duplicate_object then null;
    end
$$;

alter table tse
    add column ws_url text not null default '';
alter table tse
    add column ws_timeout double precision default 5;
alter table tse
    add column password text not null default '';
alter table tse
    add column type tse_type not null default 'diebold_nixdorf';
alter table tse
    rename column tse_id to id;
alter table tse
    rename column tse_name to name;
alter table tse
    rename column tse_status to status;
alter table tse
    rename column tse_serial to serial;
alter table tse
    alter column serial set not null;
alter table tse
    rename column tse_hashalgo to hashalgo;
alter table tse
    rename column tse_time_format to time_format;
alter table tse
    rename column tse_public_key to public_key;
alter table tse
    rename column tse_certificate to certificate;
alter table tse
    rename column tse_process_data_encoding to process_data_encoding;
alter table user_tag
    rename column secret to secret_id;

-- this migration introduces tree structures for all records

create table event (
    id bigint primary key generated always as identity (start with 1000),
    currency_identifier varchar(255) not null,
    max_account_balance numeric not null,

    start_date timestamptz,
    end_date timestamptz,  -- TODO: constraint to make sure end_date > start_date

    daily_end_time time,

    -- previous values in settings / no other place to put them yet
    ust_id text not null,
    bon_issuer text not null,
    bon_address text not null,
    bon_title text not null,

    sumup_payment_enabled bool not null,
    sumup_affiliate_key text not null,

    sumup_topup_enabled bool not null,
    sumup_api_key text not null,
    sumup_merchant_code text not null,

    customer_portal_url text not null,
    customer_portal_about_page_url text not null,
    customer_portal_data_privacy_url text not null,
    customer_portal_contact_email text not null,

    -- TODO: constraint other values to be set if sepa is enabled
    sepa_enabled bool not null,
    sepa_sender_name text,
    sepa_sender_iban text,
    sepa_description text,
    sepa_allowed_country_codes text[]
);

create table language (
    code varchar(5) not null primary key
);

insert into language (code) values
('en-US'), ('de-DE');

create table translation_text (
    event_id bigint not null references event(id),
    lang_code varchar(5) not null references language(code),
    type text not null,
    content text not null,
    primary key (event_id, lang_code, type)
);

insert into event (
    id, currency_identifier, sumup_topup_enabled, max_account_balance, ust_id, bon_issuer, bon_address, bon_title,
    customer_portal_contact_email, sepa_enabled, sepa_sender_name, sepa_sender_iban,
    sepa_description, sepa_allowed_country_codes, customer_portal_url, customer_portal_about_page_url,
    customer_portal_data_privacy_url, sumup_payment_enabled, sumup_affiliate_key, sumup_api_key, sumup_merchant_code
) overriding system value
select
    0,
    (select value from config where key = 'currency.identifier'),
    (select value = 'true' from config where key = 'sumup_topup.enabled'),
    (select value::numeric from config where key = 'max_account_balance'),
    (select value from config where key = 'ust_id'),
    (select value from config where key = 'bon.issuer'),
    (select value from config where key = 'bon.addr'),
    (select value from config where key = 'bon.title'),
    (select value from config where key = 'customer_portal.contact_email'),
    true, -- sepa enabled
    (select value from config where key = 'customer_portal.sepa.sender_name'),
    (select value from config where key = 'customer_portal.sepa.sender_iban'),
    (select value from config where key = 'customer_portal.sepa.description'),
    (select array(select json_array_elements_text(value::json)) from config where key = 'customer_portal.sepa.allowed_country_codes'),
    '', -- customer_portal_url
    '', -- customer_portal_about_page_url
    '', -- customer_portal_data_privacy_url
    false, -- sumup_payment_enabled
    '', -- sumup_affiliate_key
    '', -- sumup_api_key
    ''; -- sumup_merchant_code

alter table event alter column sepa_allowed_country_codes set not null;
alter table event alter column sepa_description set not null;
alter table event alter column sepa_sender_iban set not null;
alter table event alter column sepa_sender_name set not null;

-- we no longer need the hard coded entries in config table, all configuration has been made event specific
delete from config; -- TODO: debate if we need the table at all -> now it is empty

-- one tree node, references exactly one parent
create table node (
    id bigint primary key generated always as identity (start with 1000),
    parent bigint not null references node(id),

    name text not null,
    description text not null default '',
    event_id bigint references event(id) unique,
    -- generated by trigger, will never be null, we cannot constrain this to be not null directly as not null constraints are checked before triggers
    path text,
    -- generated by trigger, will never be null, we cannot constrain this to be not null directly as not null constraints are checked before triggers
    parent_ids bigint[],
    event_node_id bigint references node(id), -- id of the next node up the tree which has an event associated
    parents_until_event_node bigint[]
);

create table tree_object_type (
    name varchar(255) primary key
);

insert into tree_object_type (name)
values
('user'), ('user_role'), ('product'), ('ticket'), ('till'), ('terminal'), ('tax_rate'), ('account'), ('user_tag');

create table forbidden_objects_at_node (
    object_name varchar(255) not null references tree_object_type(name),
    node_id bigint not null references node(id),
    primary key (object_name, node_id)
);

create table forbidden_objects_in_subtree_at_node (
    object_name varchar(255) not null references tree_object_type(name),
    node_id bigint not null references node(id),
    primary key (object_name, node_id)
);

create index on node (parent);

-- create default nodes, we can use a bulk insert here as no trigger has yet been loaded,
-- which also means we need to manually compute the parent ids and path
insert into node (
    id, parent, event_id, name, parent_ids, path, event_node_id, parents_until_event_node
) overriding system value
values
    (0, 0, null, 'root', '{0}', '/0', null, null),
    (1, 0, 0, 'event', '{0}', '/0/1', 1, '{}')
    on conflict do nothing;

-- add the node column to all elements in the tree, and reference the 'event' node.
alter table account add column node_id bigint not null references node(id) default 1;
alter table account alter column node_id drop default;

alter table cash_register add column node_id bigint not null references node(id) default 1;
alter table cash_register alter column node_id drop default;

alter table cash_register_stocking add column node_id bigint not null references node(id) default 1;
alter table cash_register_stocking alter column node_id drop default;

alter table config add column node_id bigint not null references node(id) default 1;
alter table config alter column node_id drop default;

alter table payout_run add column node_id bigint not null references node(id) default 1;
alter table payout_run alter column node_id drop default;

alter table product add column node_id bigint not null references node(id) default 1;
alter table product alter column node_id drop default;

alter table restriction_type add column node_id bigint not null references node(id) default 1;
alter table restriction_type alter column node_id drop default;

alter table tax add column node_id bigint not null references node(id) default 1;
alter table tax alter column node_id drop default;

alter table till add column node_id bigint not null references node(id) default 1;
alter table till alter column node_id drop default;

alter table till_button add column node_id bigint not null references node(id) default 1;
alter table till_button alter column node_id drop default;

alter table till_layout add column node_id bigint not null references node(id) default 1;
alter table till_layout alter column node_id drop default;

alter table till_profile add column node_id bigint not null references node(id) default 1;
alter table till_profile alter column node_id drop default;

alter table tse add column node_id bigint not null references node(id) default 1;
alter table tse alter column node_id drop default;

alter table user_role add column node_id bigint not null references node(id) default 1;
alter table user_role alter column node_id drop default;

alter table user_tag add column node_id bigint not null references node(id) default 1;
alter table user_tag alter column node_id drop default;

alter table user_tag_secret add column node_id bigint not null references node(id) default 1;
alter table user_tag_secret alter column node_id drop default;

alter table usr add column node_id bigint not null references node(id) default 1;
alter table usr alter column node_id drop default;

alter table user_to_role add column node_id bigint not null references node(id) default 1;
alter table user_to_role alter column node_id drop default;

-- TODO: add synthetic numeric primary key to tax table
alter table tax rename to tax_rate;
alter table tax_rate add column id bigint not null generated always as identity (start with 1000) unique;

alter table product add column tax_rate_id bigint references tax_rate(id);
update product set tax_rate_id = t.id from product p join tax_rate t on p.tax_name = t.name where product.id = p.id;
alter table product alter column tax_rate_id set not null;
alter table product drop column tax_name;

alter table line_item add column tax_rate_id bigint references tax_rate(id);
update line_item set tax_rate_id = t.id from line_item l join tax_rate t on l.tax_name = t.name
where line_item.item_id = l.item_id and line_item.order_id = l.order_id;
alter table line_item alter column tax_rate_id set not null;

alter table tax_rate drop constraint tax_pkey;
alter table tax_rate add constraint tax_rate_pkey primary key (id);

alter table usr drop constraint usr_login_key;

-- we cannot drop this yet as it would break login in admin
-- alter table usr drop constraint usr_login_key;
alter table till_button drop constraint till_button_name_key;
alter table till_layout drop constraint till_layout_name_key;
alter table till_profile drop constraint till_profile_name_key;
alter table till drop constraint till_name_key;
alter table cash_register_stocking drop constraint cash_register_stocking_name_unique;
alter table cash_register drop constraint cash_register_name_unique;

alter table till add column is_virtual bool default false;
update till set is_virtual = true where id = 1;  -- set is_virtual flag for initial hard coded virtual till

drop table allowed_user_roles_for_till_profile;

insert into privilege (name)
values
    ('node_administration'),
    ('cash_transport'),
    ('customer_management'),
    ('create_user'),
    ('allow_privileged_role_assignment');

insert into user_role_to_privilege (role_id, privilege)
values
    (0, 'node_administration'),  -- admin role
    (0, 'customer_management'),  -- admin role
    (0, 'create_user'),  -- admin role
    (0, 'allow_privileged_role_assignment'),  -- admin role
    (1, 'node_administration'),  -- finanzorga role
    (1, 'cash_transport'),  -- finanzorga role
    (1, 'customer_management'),  -- finanzorga role
    (1, 'create_user'),  -- finanzorga role
    (1, 'allow_privileged_role_assignment');  -- finanzorga role

delete from user_role_to_privilege where
    privilege = 'account_management' or
    privilege = 'cashier_management' or
    privilege = 'config_management' or
    privilege = 'product_management' or
    privilege = 'tax_rate_management' or
    privilege = 'till_management' or
    privilege = 'order_management' or
    privilege = 'festival_overview';

delete from privilege
where
    name = 'account_management' or
    name = 'cashier_management' or
    name = 'config_management' or
    name = 'product_management' or
    name = 'tax_rate_management' or
    name = 'till_management' or
    name = 'order_management' or
    name = 'festival_overview';

alter table user_role drop constraint user_role_name_key;
update user_role set node_id = 0 where name = 'admin';

create table product_type (
    name varchar(255) not null primary key
);

insert into product_type (name)
values ('discount'), ('topup'), ('payout'), ('money_transfer'), ('imbalance'), ('user_defined'), ('ticket');

alter table product drop constraint product_name_key;

alter table product add column type varchar(255) references product_type(name);
update product set type = 'discount' where id = 1;
update product set type = 'topup' where id = 2;
update product set type = 'payout' where id = 3;
update product set type = 'ticket' where id = 4 or id = 5 or id = 6;
update product set type = 'money_transfer' where id = 7;
update product set type = 'imbalance' where id = 8;
update product set type = 'user_defined' where id >= 1000;
alter table product alter column type set not null;

alter table product add column ticket_metadata_id bigint references ticket(id) unique;
update product set ticket_metadata_id = t.id from product p join ticket t on t.product_id = p.id where p.id = product.id;

insert into product_restriction (id, restriction)
select p.id, t.restriction
from product p
join ticket t on p.ticket_metadata_id = t.id
where t.restriction is not null;

alter table ticket drop column name;
alter table ticket drop column description;
alter table ticket drop column restriction;
alter table ticket drop column product_id;

alter table till_layout_to_ticket add column new_ticket_id bigint references product(id);
update till_layout_to_ticket set new_ticket_id = p.id
from till_layout_to_ticket tltt join ticket t on tltt.ticket_id = t.id join product p on t.id = p.ticket_metadata_id
where tltt.layout_id = till_layout_to_ticket.layout_id and tltt.ticket_id = till_layout_to_ticket.ticket_id;
alter table till_layout_to_ticket alter column new_ticket_id set not null;
alter table till_layout_to_ticket drop column ticket_id;
alter table till_layout_to_ticket rename column new_ticket_id to ticket_id;
-- TODO: add constraint that ticket products aren't returnable and cannot have a voucher price
-- TODO: add constraint that ticket products can have at most one restriction
--  -> for tickets it is a whitelist instead of a blacklist as for usual products

alter table ticket rename to product_ticket_metadata;

insert into account_type (name)
values
('sale_exit'),
('cash_entry'),
('cash_exit'),
('cash_topup_source'),
('cash_imbalance'),
('cash_vault'),
('sumup_entry'),
('sumup_online_entry'),
('transport'), -- also a cash based account
('cashier'), -- also a cash based account
('voucher_create');

-- get rid of cash sale source account -> merge it with cash entry
update account set type = 'sale_exit' where name = 'Sale Exit';

update account set type = 'cash_entry' where name = 'Cash Entry';
update account set type = 'cash_exit' where name = 'Cash Exit';
update account set type = 'cash_topup_source', name = 'Cash Top Up Source' where name = 'Cash Sale Source';
update account set type = 'cash_imbalance', name = 'Cash Imbalance' where name = 'Imbalace';
update account set type = 'cash_vault' where name = 'Cash Vault';

update account set type = 'sumup_entry', name = 'Sumup Entry' where name = 'Sumup';
update account set type = 'sumup_online_entry', name = 'Sumup Online Entry' where name = 'Sumup customer topup';

update account set type = 'voucher_create', name = 'Voucher Create' where name = 'Money / Voucher create';

update account set type = 'transport' where name like 'transport account for %';
update account set type = 'cashier' where name like 'cashier account for %';

 -- TODO: can or should we delete this account, we don't really need it and it was not used at SSC
delete from account where name = 'Deposit';

-- TODO: include check so that we do not delete accounts here
delete from account_type where name = 'virtual' or name = 'internal';

alter table bon drop column output_file;
alter table bon add column mime_type text;
alter table bon add column content bytea;

alter table till drop column registration_uuid;
alter table till drop column session_uuid;

create table terminal (
    id bigint primary key generated always as identity (start with 1000),
    node_id bigint not null references node(id),
    name text not null,
    description text,
    registration_uuid uuid unique default gen_random_uuid(),
    session_uuid uuid unique
);

alter table till add column terminal_id bigint references terminal(id) unique;

create index on product (type, name, node_id);
create index on till (name, node_id);
create index on till_button (name, node_id);
create index on till_layout (name, node_id);
create index on till_profile (name, node_id);
create index on user_role (name, node_id);
create index on tse (name, node_id);
create index on tax_rate (name, node_id);
create index on terminal (name, node_id);
