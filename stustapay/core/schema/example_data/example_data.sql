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
    uid, pin, serial, restriction, secret_id
)
values
    (1234, 'pin', null, null, null),
    (13876489173, null, null, null, null),
    (1203053663687568, 'LOL-tag1', 'serial1', null, 0),
    (1247532345004944, 'LOL-tag2', 'serial2', null, 0),
    (1343851281585040, 'LOL-tag3', 'serial3', null, 0),
    (1183326878897040, 'LOL-tag4', 'serial4', null, 0),
    (1280032362533776, 'LOL-tag5', 'serial5', null, 0),
    (1188163012072336, 'LOL-tag6', 'serial6', null, 0),
    (1179963919504272, 'LOL-tag7', 'serial7', null, 0),
    (1300927378428816, 'LOL-tag8', 'serial8', null, 0),
    (1249727073293200, 'LOL-tag9', 'serial9', null, 0),
    (1292174235079568, 'LOL-tag10', 'serial10', null, 0),
    (1277214863987600, 'LOL-tag11', 'serial11', null, 0),
    (1338353723446160, 'LOL-tag12', 'serial12', null, 0),
    (1251926096548752, 'LOL-tag13', 'serial13', null, 0),
    (1225043896243088, 'LOL-tag14', 'serial14', null, 0),
    (1279413887243152, 'LOL-tag15', 'serial15', null, 0),
    (1336176175027088, 'LOL-tag16', 'serial16', null, 0),
    (1223944384615312, 'LOL-tag17', 'serial17', null, 0),
    (1271240564478864, 'LOL-tag18', 'serial18', null, 0),
    (1313064956007312, 'LOL-tag19', 'serial19', null, 0),
    (1276802547127184, 'LOL-tag20', 'serial20', null, 0),
    (1295429820289936, 'LOL-tag21', 'serial21', null, 0),
    (1353716821463952, 'LOL-tag22', 'serial22', null, 0),
    (1340518386963344, 'LOL-tag23', 'serial23', null, 0)
    on conflict do nothing;


insert into account (
    id, user_tag_uid, type, name, comment, balance, vouchers
) overriding system value
values
    -- virtual accounts are hard coded with ids 0-99
    -- internal
    (100, null, 'internal', 'Cash Desk 0', 'Cash money in register 0', 500.00, 0),
    (101, null, 'internal', 'Rucksack 0', 'Finanzer-rucksack', 200.00, 0),
    (102, null, 'private', 'Admin', 'Admin private account', 0.00, 0),

    -- guests (which would need token IDs)
    (200, 1234, 'private', 'Guest 0', 'Token Balance of Guest 0', 120.00, 0),
    (201, 1247532345004944, 'private', 'test-tag2', 'test token 2', 30.00, 5),
    (202, null, 'internal', 'test-tag2-internal', 'tag2 internal account', 0.0, 0),
    (203, 1343851281585040, 'private', 'test-tag3', 'test token 3', 15.00, 2),
    (204, 1183326878897040, 'private', 'test-tag4', 'test token 4', 20.00, 2),
    (205, null, 'internal', 'test-tag4-internal', 'tag4 internal account', 0.0, 0),
    (206, 1280032362533776, 'private', 'test-tag5', 'test token 5', 0.00, 0)
    on conflict do nothing;
select setval('account_id_seq', 300);


insert into cash_register (
    id, name
) overriding system value
values
    (0, 'Stahlkasse'),
    (1, 'Blechkasse 1'),
    (2, 'Blechkasse 2')
    on conflict do nothing;

insert into cash_register_stocking (
    id, name, euro20, euro10, euro5, euro2, euro1
) overriding system value
values
    (0, 'default', 5, 10, 10, 1, 1)
    on conflict do nothing;

insert into usr (
    id, login, password, description, customer_account_id, transport_account_id, cashier_account_id, cash_register_id, user_tag_uid
) overriding system value
values
    (0, 'test-cashier', null, 'Some Description', 200, null, 100, null, 1234),
    -- password is admin
    (1, 'admin', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', null, 102, null, null, null, null),
    -- tag2 is admin
    (2, 'tag2', null, null, 201, null, 202, 0, 1247532345004944),
    -- tag4 is customer
    (4, 'tag4', null, null, 204, null, 205, null, 1183326878897040),
    -- password is admin
    (5, 'finanzorga', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', null, 206, null, null, null, null)
    on conflict do nothing;
select setval('usr_id_seq', 100);

insert into user_to_role (
    user_id, role_id
)
values
    (0, 2), -- cashier
    (1, 0), -- admin -> admin
    (1, 1), -- admin -> finanzorga
    (2, 0), -- tag #2, admin
    (2, 1), -- tag #2, finanzorga
    (2, 2), -- tag #2, cashier
    (4, 2), -- tag #4, cashier
    (5, 1)  -- finanzorga -> finanzorga
    on conflict do nothing;

insert into user_role_to_privilege (
    role_id, privilege
)
values
    -- admin normally can't book orders, but for testing it's useful.
    (0, 'can_book_orders')
    on conflict do nothing;


insert into product (
    id, name, price, price_in_vouchers, fixed_price, target_account_id, tax_name, is_returnable, is_locked
) overriding system value
values
    -- Special Product: id 0-99
    -- Pfand
    (10, 'Pfand', 2.00, null, true, 2, 'none', true, true),

    -- Getränke
    (100, 'Helles 1.0l', 5.00, 2, true, null, 'ust', false, true),
    (101, 'Helles 0.5l', 3.00, 1, true, null, 'ust', false, true),
    (102, 'Weißbier 1.0l', 5.00, 2, true, null, 'ust', false, true),
    (103, 'Weißbier 0.5l', 3.00, 1, true, null, 'ust', false, true),
    (104, 'Radler 1.0l', 5.00, 2, true, null, 'ust', false, true),
    (105, 'Radler 0.5l', 3.00, 1, true, null, 'ust', false, true),
    (106, 'Russ 1.0l', 5.00, 2, true, null, 'ust', false, true),
    (107, 'Russ 0.5l', 3.00, 1, true, null, 'ust', false, true),
    (108, 'Limonade 1.0l', 2.00, 2, true, null, 'ust', false, true),
    (109, 'Whisky 1.0l', 20.00, 10, true, null, 'ust', false, true),
    -- Essen
    (150, 'Weißwurst', 2.00, null, true, null, 'eust', false, true),
    -- Freipreis
    (1000, 'Brotladen', null, null, false, null, 'transparent', false, true)
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


insert into ticket (
    id, name, product_id, initial_top_up_amount, restriction
) overriding system value
values
    (0, 'Eintritt incl. 8€', 4, 8, null),
    (1, 'Eintritt', 4, 0, null),
    (2, 'Eintritt U18 incl. 8€', 5, 8, 'under_18'),
    (3, 'Eintritt U18', 5, 0, 'under_18'),
    (4, 'Eintritt U16', 6, 0, 'under_16')
    on conflict do nothing;


insert into till_button (
    id, name
) overriding system value
values
    (0, 'Helles 0,5l'),
    (1, 'Helles 1,0l'),
    (2, 'Russ 0,5l'),
    (3, 'Pfand zurück'),
    (4, 'Brotladen'),
    (5, 'Weißwurst')
    on conflict do nothing;
select setval('till_button_id_seq', 100);

insert into till_button_product (
    button_id, product_id
)  values
    -- getränke + pfand
    (0, 101),
    (0, 10),
    (1, 100),
    (1, 10),
    (2, 107),
    (2, 10),
    (3, 10),
    -- brotladen
    (4, 1000),
    -- weißwurst
    (5, 150)
    on conflict do nothing;


insert into till_layout (
    id, name, description
) overriding system value
values
    (2, 'Alles', 'Alle Features zum Testen'),
    (3, 'Bierkasse', 'Allgemeine Bierkasse'),
    (4, 'Aufladekasse', 'Allgemeine Aufladekasse'),
    (5, 'Brotladen', 'Brotladen-Kasse'),
    (6, 'Eintritt + 0€', 'Eintrittskasse ohne Startguthaben'),
    (7, 'Eintritt + 8€', 'Eintrittskasse mit Startguthaben'),
    (8, 'Eintritt + Aufladen', 'Hybride Eintritts & Aufladekasse')
    on conflict do nothing;
select setval('till_layout_id_seq', 100);

insert into till_layout_to_button (
    layout_id, button_id, sequence_number
) values
    -- dev
    (2, 0, 0),
    (2, 1, 1),
    (2, 2, 2),
    (2, 3, 3),
    (2, 4, 4),
    (2, 5, 5),
    -- bierkasse
    (3, 0, 0),
    (3, 1, 1),
    (3, 2, 2),
    (3, 3, 3),
    -- aufladekasse has no buttons
    -- brotladen
    (5, 4, 1)
    -- eintritt has no buttons
    on conflict do nothing;

insert into till_layout_to_ticket (
    layout_id, ticket_id, sequence_number
) values
    -- tickets without initial topup for all-features-till
    (2, 1, 0),
    (2, 3, 1),
    (2, 4, 2),
    -- tickets with initial topup
    (6, 0, 0),
    (6, 2, 1),
    (6, 4, 2),
    -- tickets without initial topup.
    (7, 1, 0),
    (7, 3, 1),
    (7, 4, 2),
    -- aufladekasse + eintritt ohne startguthaben
    (8, 1, 0),
    (8, 3, 1),
    (8, 4, 2)
    on conflict do nothing;

insert into till_profile (
    id, name, description, layout_id, allow_top_up, allow_cash_out, allow_ticket_sale
) overriding system value
values
    (2, 'Develop', 'Allmächtige Kasse', 2, true, true, true),
    (3, 'Pot', 'Pot Bierkasse', 3, false, false, false),
    (4, 'Festzelt Aufladung', 'Aufladekasse', 4, true, true, false),
    (5, 'Brotladen', 'Brotladen-Kasse', 5, false, false, false),
    (6, 'Ticket + Guthaben', 'Mit initialem Guthaben', 6, false, false, true),
    (7, 'Ticket ohne Guthaben', 'Ohne initiales Guthaben', 7, false, false, true),
    (8, 'Ticket + Aufladung', 'Tickets ohne initiales Guthaben', 8, false, true, true)
    on conflict do nothing;
select setval('till_profile_id_seq', 100);

-- what roles can be used on this till profile
insert into allowed_user_roles_for_till_profile (profile_id, role_id)
values
    (2, 0),
    (2, 1),
    (2, 2),
    (2, 3),
    (2, 4),
    (3, 0),
    (3, 1),
    (3, 2),
    (3, 3),
    (3, 4),
    (4, 0),
    (4, 1),
    (4, 2),
    (4, 3),
    (4, 4),
    (5, 0),
    (5, 1),
    (5, 2),
    (5, 3),
    (5, 4)
    on conflict do nothing;


-- configure one TSE 'tse1' for testing
insert into tse (
    tse_id, tse_name
) overriding system value
values
    (0, 'tse1')
    on conflict do nothing;


insert into till (
    id, name, description, active_profile_id, active_user_id, active_user_role_id, active_cash_register_id, registration_uuid, session_uuid, tse_id, active_shift
) overriding system value
values
    -- 1 is virtual till!
    (10, 'stustapay-dev', 'Allmachtskasse', 2, 2, 0, 0, '4c8e406f-a579-45f5-a626-dc8675b65b2e'::uuid, null, null, null),
    (11, 'ssc-festzelt-topup-1', 'Aufladung im Festzelt', 4, null, null, null, '479fc0b0-c2ca-4af9-a2f2-3ee5482d647b'::uuid, null, null, null),
    (12, 'ssc-pot-1', 'Pot Bierkasse', 3, null, null, null, '5ed89dbd-5af4-4c0c-b521-62e366f72ba9'::uuid, null, null, null),
    (13, 'ssc-brotladen-1', 'Brotladen', 5, null, null, null, '6450c106-207c-4f17-b451-249c98ae6f19'::uuid, null, null, null),
    (14, 'ssc-eintritt-1', 'Eintritt ohne Initialguthaben', 7, null, null, null, 'dc48a5b1-09d3-424f-820d-0452613c172c'::uuid, null, null, null),
    (15, 'ssc-eintritt-2', 'Eintritt mit Initialguthaben', 6, null, null, null, 'f98f56ee-0023-47a9-8059-ff645b66b686'::uuid, null, null, null),
    (16, 'ssc-eintritt-3', 'Eintritt ohne Guthaben und Aufladen', 8, null, null, null, 'ea847685-d400-414d-a0c0-9cd431791f15'::uuid, null, null, null)
    on conflict do nothing;
select setval('till_id_seq', 100);

insert into ordr (
    id, item_count, booked_at, payment_method, order_type,
    cashier_id, till_id, customer_account_id, z_nr
) overriding system value
values
    -- simple beer with deposit
    (0, 2, '2023-01-01 15:35:02 UTC+1', 'tag', 'sale', 0, 12, 200, 1),
    (3, 2, '2023-01-01 16:35:02 UTC+1', 'tag', 'sale', 0, 12, 200, 1),
    (4, 2, '2023-01-01 17:35:02 UTC+1', 'tag', 'sale', 0, 12, 200, 1),
    -- items with different tax rates
    (1, 3, '2023-01-02 17:00:07 UTC+1', 'tag', 'sale', 0, 13, 201, 1),
    -- Top Up EC
    (2, 1, '2023-01-01 17:00:07 UTC+1', 'tag', 'sale', 0, 11, 201, 1)
    on conflict do nothing;
select setval('ordr_id_seq', 100);


insert into line_item (
    order_id, item_id, product_id, quantity, product_price, tax_name, tax_rate
)
values
    -- simple beer with deposit
    (0, 0, 100, 1, 5.00, 'ust', 0.19), -- beer
    (0, 1, 10, 1, 2.00, 'none', 0.00), -- deposit
    -- simple beer with deposit
    (3, 0, 100, 1, 5.00, 'ust', 0.19), -- beer
    (3, 1, 10, 1, 2.00, 'none', 0.00), -- deposit
    -- simple beer with deposit
    (4, 0, 100, 1, 5.00, 'ust', 0.19), -- beer
    (4, 1, 10, 1, 2.00, 'none', 0.00), -- deposit
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
    (0, true, '2023-01-01 15:34:57 UTC+1', null, 'test_bon.pdf')
on conflict (id) do update
set
    generated = EXCLUDED.generated,
    generated_at = EXCLUDED.generated_at,
    error = EXCLUDED.error,
    output_file = EXCLUDED.output_file;

insert into tse_signature (
    id
)
values
    -- 0 already has bon entry
    (1),
    (2)
    on conflict do nothing;

commit;
