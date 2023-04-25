-- stustapay example data
--
-- Add test data to tables in the base schema
-- targets >=postgresql-13

begin;

set plpgsql.extra_warnings to 'all';
set datestyle to 'ISO';


insert into user_tag_secret (
    id, key0, key1
) overriding system value
values
    (0, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex'))
    on conflict do nothing;


insert into user_tag (
    uid, pin, serial, restriction, secret
)
values
    (1234, null, null, null, null),
    (13876489173, null, null, null, null),
    (5424726191074820, 'LOL-tag2', 'serial2', null, 0),
    (5223726016640516, 'LOL-tag3', 'serial3', null, 0),
    (5424726268326916, 'LOL-tag4', 'serial4', null, 0)
    on conflict do nothing;


insert into account (
    id, user_tag_uid, type, name, comment, balance, vouchers
) overriding system value
values
    -- virtual accounts are hard coded with ids 0-99
    -- internal
    (100, null, 'internal', 'Cash Desk 0', 'Cash money in register 0', 500.00, 0),
    (101, null, 'internal', 'Rucksack 0', 'Finanzer-rucksack', 200.00, 0),

    -- guests (which would need token IDs)
    (200, 1234, 'private', 'Guest 0', 'Token Balance of Guest 0', 2000000.00, 0),
    (201, 13876489173, 'private', 'Guest 1', 'Token Balance of Guest 1', 30000000.20, 0),
    (201, 5424726191074820, 'private', 'test-tag2', 'test token 2', 30.00, 5),
    (202, null, 'internal', 'test-tag2-internal', 'tag2 internal account', 0.0, 0),
    (203, 5223726016640516, 'private', 'test-tag3', 'test token 3', 15.00, 2),
    (204, 5424726268326916, 'private', 'test-tag4', 'test token 4', 20.00, 2)
    on conflict do nothing;
select setval('account_id_seq', 300);


insert into usr (
    id, login, password, description, transport_account_id, cashier_account_id, user_tag_uid
) overriding system value
values
    (0, 'test-cashier', null, 'Some Description', null, 100, 1234),
    -- password is admin
    (1, 'admin' , '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', null, null, null, null),
    (2, 'tag2', null, null, null, 202, 5424726191074820),
    (4, 'tag4', null, null, null, null, 5424726268326916)
    on conflict do nothing;
select setval('usr_id_seq', 100);


insert into usr_privs (
    usr, priv
)
values
    (1, 'admin'),
    (0, 'cashier'),
    (2, 'admin'), -- tag #2
    (2, 'cashier'),
    (4, 'cashier') -- tag #4
    on conflict do nothing;


insert into product (
    id, name, price, price_in_vouchers, fixed_price, target_account_id, tax_name, is_returnable
) overriding system value
values
    -- Special Product: id 0-99
    -- Pfand
    (10, 'Pfand', 2.00, null, true, 2, 'none', true),

    -- Getränke
    (100, 'Helles 1.0l', 5.00, 2, true, null, 'ust', false),
    (101, 'Helles 0.5l', 3.00, 1, true, null, 'ust', false),
    (102, 'Weißbier 1.0l', 5.00, 2, true, null, 'ust', false),
    (103, 'Weißbier 0.5l', 3.00, 1, true, null, 'ust', false),
    (104, 'Radler 1.0l', 5.00, 2, true, null, 'ust', false),
    (105, 'Radler 0.5l', 3.00, 1, true, null, 'ust', false),
    (106, 'Russ 1.0l', 5.00, 2, true, null, 'ust', false),
    (107, 'Russ 0.5l', 3.00, 1, true, null, 'ust', false),
    (108, 'Limonade 1.0l', 2.00, 2, true, null, 'ust', false),
    (109, 'Whisky 1.0l', 20.00, 10, true, null, 'ust', false),
    -- Essen
    (150, 'Weißwurst', 2.00, null, true, null, 'eust', false),
    -- Freipreis
    (1000, 'Brotladen', null, null, false, null, 'transparent', false)
    on conflict do nothing;
select setval('product_id_seq', 200);

insert into product_restriction (
    id, restriction
)
values
    -- alcohol is not allowed below 16
    (100, 'under_16'),
    (101, 'under_16'),
    (102, 'under_16'),
    (103, 'under_16'),
    (104, 'under_16'),
    (105, 'under_16'),
    (106, 'under_16'),
    (107, 'under_16'),
    -- whisky is not allowed below 18 (and thus explicit below 16)
    (109, 'under_16'),
    (109, 'under_18')
    on conflict do nothing;

insert into till_button (
    id, name
) overriding system value
values
    (0, 'Helles 0,5l'),
    (1, 'Helles 1,0l'),
    (2, 'Russ 0,5l'),
    (3, 'Pfand zurück'),
    (4, 'Brotladen')
    on conflict do nothing;
select setval('till_button_id_seq', 100);

insert into till_button_product (
    button_id, product_id
)  values
    (0, 101),
    (0, 10),
    (1, 100),
    (1, 10),
    (2, 107),
    (2, 10),
    (3, 10),
    (4, 1000)
    on conflict do nothing;


insert into till_layout (
    id, name, description
) overriding system value
values
    (0, 'Bierkasse', 'Allgemeine Bierkasse'),
    (1, 'Aufladekasse', 'Allgemeine Aufladekasse')
    on conflict do nothing;
select setval('till_layout_id_seq', 100);

insert into till_layout_to_button (
    layout_id, button_id, sequence_number
) values
    (0, 0, 0),
    (0, 1, 1),
    (0, 2, 2),
    (0, 3, 3),
    (0, 4, 4)
    on conflict do nothing;

insert into till_profile (
    id, name, description, layout_id, allow_top_up, allow_cash_out
) overriding system value
values
    (0, 'Pot', 'Allgemeine Pot Bierkasse', 0, false, false),
    (1, 'Festzelt Aufladung', 'Aufladekasse', 1, true, true)
    on conflict do nothing;
select setval('till_profile_id_seq', 100);

insert into till (
    id, name, description, registration_uuid, session_uuid, tse_id, active_shift, active_profile_id
) overriding system value
values
    (0, 'ssc-pot-1', 'Pot Bierkasse', '5ed89dbd-5af4-4c0c-b521-62e366f72ba9'::uuid, null, 'tse 0', null, 0),
    (1, 'ssc-festzelt-topup-1', 'Aufladung im Festzelt', '479fc0b0-c2ca-4af9-a2f2-3ee5482d647b'::uuid, null, 'tse 0', null, 1)
    on conflict do nothing;
select setval('till_id_seq', 100);


insert into ordr (
    id, item_count, booked_at, payment_method, order_type,
    cashier_id, till_id, customer_account_id
) overriding system value
values
    -- simple beer with deposit
    (0, 2, '2023-01-01 15:35:02 UTC+1', 'token', 'sale', 0, 0, 200),
    -- items with different tax rates
    (1, 3, '2023-01-02 17:00:07 UTC+1', 'token', 'sale', 0, 0, 201),
    -- Top Up EC
    (2, 1, '2023-01-01 17:00:07 UTC+1', 'token', 'sale', 0, 0, 201)
    on conflict do nothing;
select setval('ordr_id_seq', 100);


insert into line_item (
    order_id, item_id, product_id, quantity, product_price, tax_name, tax_rate
)
values
    -- simple beer with deposit
    (0, 0, 100, 1, 5.00, 'ust', 0.19), -- beer
    (0, 1, 10, 1, 2.00, 'none', 0.00), -- deposit
    -- items with different tax rates
    (1, 0, 100, 2, 5.00, 'ust', 0.19), -- beer
    (1, 1, 10, 2, 2.00, 'none', 0.00), -- deposit
    (1, 2, 150, 1, 2.00, 'eust', 0.07), -- other tax rate
    -- Top Up EC
    (2, 0, 3, 20, 1.00, 'none', 0.00) -- Load 20 Money
    on conflict do nothing;

insert into transaction (
    id, order_id, description, source_account, target_account, booked_at, amount, vouchers
) overriding system value
values
    -- simple beer with deposit
    (0, 0, null, 200, 0, '2023-01-01 15:35:01 UTC+1', 5.00, 0),
    (1, 0, null, 200, 2, '2023-01-01 15:35:02 UTC+1', 2.00, 0),
    -- items with different tax rates
    (2, 1, null, 201, 0, '2023-01-02 17:00:05 UTC+1', 10.00,0),
    (3, 1, null, 201, 2, '2023-01-02 17:00:06 UTC+1', 4.00, 0),
    (4, 1, null, 201, 2, '2023-01-02 17:00:07 UTC+1', 2.00, 0),
    -- Top Up EC
    (5, 2, null, 3, 201, '2023-01-01 17:00:06 UTC+1', 20.00, 0)
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

