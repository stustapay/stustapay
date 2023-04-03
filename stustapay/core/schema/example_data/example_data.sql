-- stustapay example data
--
-- Add test data to tables in the base schema
-- targets >=postgresql-13

begin;

set plpgsql.extra_warnings to 'all';
set datestyle to 'ISO';


insert into user_tag (
    uid, pin, serial, restriction, secret
)
values
    (1234, null, null, null, null),
    (13876489173, null, null, null, null)
    on conflict do nothing;


insert into account (
    id, user_tag_uid, type, name, comment, balance
)
values
    -- virtual accounts are hard coded with ids 0-99
    -- internal
    (100, null, 'internal', 'Cash Desk 0', 'Cash money in register 0', 500.00),
    (101, null, 'internal', 'Rucksack 0', 'Finanzer-rucksack', 200.00),

    -- guests (which would need token IDs)
    (200, 0, 'private', 'Guest 0', 'Token Balance of Guest 0', 2000000.00),
    (201, 1, 'private', 'Guest 1', 'Token Balance of Guest 1', 30000000.20)
    on conflict do nothing;
select setval('account_id_seq', 300);


insert into usr (
    id, name, password, description, transport_account_id, cashier_account_id, user_tag_uid
)
values
    -- password is admin
    (0, 'test-cashier', null, 'Some Description', null, 100, 1234),
    -- password is admin
    (1, 'admin' , '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W' , null, null, null, null)
    on conflict do nothing;
select setval('usr_id_seq', 100);


insert into usr_privs (
    usr, priv
)
values
    (1, 'admin'),
    (0, 'cashier')
    on conflict do nothing;


insert into product (
    id, name, price, fixed_price, target_account_id, tax_name
)
values
    -- Getränke
    (0, 'Helles 1.0l', 5.00, true, null, 'ust'),
    (1, 'Helles 0.5l', 3.00, true, null, 'ust'),
    (2, 'Weißbier 1.0l', 5.00, true, null, 'ust'),
    (3, 'Weißbier 0.5l', 3.00, true, null, 'ust'),
    (4, 'Radler 1.0l', 5.00, true, null, 'ust'),
    (5, 'Radler 0.5l', 3.00, true, null, 'ust'),
    (6, 'Russ 1.0l', 5.00, true, null, 'ust'),
    (7, 'Russ 0.5l', 3.00, true, null, 'ust'),
    (8, 'Limonade 1.0l', 2.00, true, null, 'ust'),
    (14, 'Whisky 1.0l', 20.00, true, null, 'ust'),
    -- Essen
    (9, 'Weißwurst', 2.00, true, null, 'eust'),
    -- Pfand
    (10, 'Pfand', 2.00, true, 2, 'none'),
    (11, 'Pfand zurück', -2.00, true, 2, 'none'),
    -- Top Up
    (12, 'Aufladen', null, false, null, 'none'),
    (13, 'Auszahlen', null, false, null, 'none')
    on conflict do nothing;
select setval('product_id_seq', 100);

insert into product_restriction (
    id, restriction
)
values
    -- alcohol is not allowed below 16
    (0, 'under_16'),
    (1, 'under_16'),
    (2, 'under_16'),
    (3, 'under_16'),
    (4, 'under_16'),
    (5, 'under_16'),
    (6, 'under_16'),
    (7, 'under_16'),
    -- whisky is not allowed below 18 (and thus explicit below 16)
    (14, 'under_16'),
    (14, 'under_18')
    on conflict do nothing;

insert into till_button (
    id, name
) values
    (0, 'Helles 0,5l'),
    (1, 'Helles 1,0l');
select setval('till_button_id_seq', 100);

insert into till_button_product (
    button_id, product_id
)  values
    (0, 1),
    (0, 10),
    (1, 0),
    (1, 10);

insert into till_layout (
    id, name, description
)
values
    (0, 'Bierkasse', 'Allgemeine Bierkasse')
on conflict do nothing;
select setval('till_layout_id_seq', 100);

insert into till_layout_to_button (
    layout_id, button_id, sequence_number
) values
    (0, 0, 0),
    (0, 1, 1);

insert into till_profile (
    id, name, description, layout_id
)
values
    (0, 'Pot', 'Allgemeine Pot Bierkasse', 0)
on conflict do nothing;
select setval('till_profile_id_seq', 100);

insert into till (
    id, name, description, registration_uuid, session_uuid, tse_id, active_shift, active_profile_id
)
values
    (0, 'Terminal 0', 'Test Terminal', null, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'tse 0', 'Shift 0', 0)
    on conflict do nothing;
select setval('till_id_seq', 100);


insert into ordr (
    id, itemcount, status, created_at, finished_at, payment_method, order_type,
    cashier_id, till_id, customer_account_id
)
values
    -- simple beer with deposit
    (0, 2, 'done', '2023-01-01 15:34:17 UTC+1', '2023-01-01 15:35:02 UTC+1', 'token', 'sale', 0, 0, 200),
    -- items with different tax rates
    (1, 3, 'done', '2023-01-02 16:59:20 UTC+1', '2023-01-02 17:00:07 UTC+1', 'token', 'sale', 0, 0, 201),
    -- Top Up EC
    (2, 1, 'done', '2023-01-01 16:59:20 UTC+1', '2023-01-01 17:00:07 UTC+1', 'token', 'sale', 0, 0, 201)
    on conflict do nothing;
select setval('ordr_id_seq', 100);


insert into lineitem (
    order_id, item_id, product_id, quantity, price, tax_name, tax_rate
)
values
    -- simple beer with deposit
    (0, 0, 0, 1, 5.00, 'ust', 0.19), -- beer
    (0, 1, 10, 1, 2.00, 'none', 0.00), -- deposit
    -- items with different tax rates
    (1, 0, 0, 2, 5.00, 'ust', 0.19), -- beer
    (1, 1, 10, 2, 2.00, 'none', 0.00), -- deposit
    (1, 2, 9, 1, 2.00, 'eust', 0.07), -- other tax rate
    -- Top Up EC
    (2, 0, 13, 20, 1.00, 'none', 0.00) -- Load 20 Money
    on conflict do nothing;

insert into transaction (
    id, order_id, description, source_account, target_account, booked_at, amount, tax_rate, tax_name
)
values
    -- simple beer with deposit
    (0, 0, null, 200, 0, '2023-01-01 15:35:01 UTC+1', 5.00, 0.19, 'ust'),
    (1, 0, null, 200, 2, '2023-01-01 15:35:02 UTC+1', 2.00, 0.00, 'none'),
    -- items with different tax rates
    (2, 1, null, 201, 0, '2023-01-02 17:00:05 UTC+1', 10.00, 0.19, 'ust'),
    (3, 1, null, 201, 2, '2023-01-02 17:00:06 UTC+1', 4.00, 0.00, 'none'),
    (4, 1, null, 201, 2, '2023-01-02 17:00:07 UTC+1', 2.00, 0.07, 'eust'),
    -- Top Up EC
    (5, 2, null, 3, 201, '2023-01-01 17:00:06 UTC+1', 20.00, 0.00, 'none')
    on conflict do nothing;
select setval('transaction_id_seq', 100);

insert into bon (
    id, generated, generated_at, error, output_file
)
values
    (0, true, '2023-01-01 15:34:57 UTC+1', null, null),
    (1, false, null, null, null)
    -- transaction 2 would not need a bon, as it is a top up
    on conflict do nothing;

commit;

