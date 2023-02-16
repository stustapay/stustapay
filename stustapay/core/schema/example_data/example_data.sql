-- stustapay example data
--
-- Add test data to tables in the base schema
-- targets >=postgresql-13

begin;

set plpgsql.extra_warnings to 'all';


-- account
insert into account (
    id, token_id, type, name, comment, balance
)
values
    (0, null, 'virtual', 'Input', 'Money payed at the festival', 1234.56),
    (2, null, 'virtual', 'Output', 'Warenausgangkonto', 523.41),
    (3, null, 'virtual', 'Sumup ec', 'Sumup Account', 5176.87),
    (4, null, 'virtual', 'Cash Vault', 'Main Cash location', 200.50),
    (5, null, 'virtual', 'Deposit', 'Deposit paid by the guests', 402.00),
    (6, null, 'internal', 'Cash Desk 0', 'Cash money in register 0', 500.00),
    (7, null, 'internal', 'Rucksack 0', 'Finanzer-rucksack', 200.00),

    -- guests (which would need token IDs)
    (10, null, 'private', 'Guest 0', 'Token Balance of Guest 0', 20.00),
    (11, null, 'private', 'Guest 1', 'Token Balance of Guest 1', 300.20)
    on conflict do nothing;


insert into usr (
    id, name, password, description, account
)
values
    (0, 'Test Cashier', 'password', 'Some Description', 6)
    on conflict do nothing;


insert into product (
    id, name, price, tax
)
values
    -- Getränke
    (0, 'Helles 1.0l', 4.2016806722, 'ust'), -- brutto price 5.00
    (1, 'Helles 0.5l', 2.5210084033, 'ust'), -- brutto price 3.00
    (2, 'Weißbier 1.0l', 4.2016806722, 'ust'),
    (3, 'Weißbier 0.5l', 2.5210084033, 'ust'),
    (4, 'Radler 1.0l', 4.2016806722, 'ust'),
    (5, 'Radler 0.5l', 2.5210084033, 'ust'),
    (6, 'Russ 1.0l', 4.2016806722, 'ust'),
    (7, 'Russ 0.5l', 2.5210084033, 'ust'),
    (8, 'Limonade 1.0l', 1.6806722689, 'ust'), -- brutto price 2.00
    -- Essen
    (9, 'Weißwurst', 1.8691588785, 'eust'), -- brutto price 2.00
    -- Pfand
    (10, 'Pfand', 2.00, 'none'),
    (11, 'Pfand zurück', -2.00, 'none'),
    -- Top Up
    (12, '1€ Aufladen Bar', 1.00, 'none'),
    (13, '1€ Aufladen EC', 1.00, 'none')
    on conflict do nothing;


insert into terminal (
    id, name, description, registration_uuid, session_uuid, tse_id, active_shift, active_profile, active_cashier
)
values
    (0, 'Terminal 0', 'Test Terminal', null, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'tse 0', 'Shift 0', null, 0)
    on conflict do nothing;


insert into ordr (
    id, itemcount, status, created_at, finished_at, payment_method, cashier_id, terminal_id, customer_account_id
)
values
    -- simple beer with deposit
    (0, 2, 'done', '01.01.2023 15:34:17 UTC+1', '01.01.2023 15:35:02 UTC+1', 'token', 0, 0, 10),
    -- items with different tax rates
    (1, 3, 'done', '02.01.2023 16:59:20 UTC+1', '02.01.2023 17:00:07 UTC+1', 'token', 0, 0, 11),
    -- Top Up EC
    (2, 1, 'done', '01.01.2023 16:59:20 UTC+1', '01.01.2023 17:00:07 UTC+1', 'token', 0, 0, 11)
    on conflict do nothing;


insert into lineitem (
    order_id, item_id, product_id, quantity, price, tax_name, tax_rate
)
values
    -- simple beer with deposit
    (0, 0, 0, 1, 4.20, 'ust', 0.19), -- beer
    (0, 1, 10, 1, 2.00, 'none', 0.00), -- deposit
    -- items with different tax rates
    (1, 0, 0, 2, 4.20, 'ust', 0.19), -- beer
    (1, 1, 10, 2, 2.00, 'none', 0.00), -- deposit
    (1, 2, 9, 1, 1.87, 'eust', 0.07), -- other tax rate
    -- Top Up EC
    (2, 0, 13, 20, 1.00, 'none', 0.00) -- Load 20 Money
    on conflict do nothing;

insert into transaction (
    id, order_id, description, source_account, target_account, booked_at, amount, tax_rate, tax_name
)
values
    -- simple beer with deposit
    (0, 0, null, 10, 2, '01.01.2023 15:35:01 UTC+1', 5.00, 0.19, 'ust'),
    (1, 0, null, 10, 5, '01.01.2023 15:35:02 UTC+1', 2.00, 0.00, 'none'),
    -- items with different tax rates
    (2, 1, null, 11, 2, '02.01.2023 17:00:05 UTC+1', 10.00, 0.19, 'ust'),
    (3, 1, null, 11, 5, '02.01.2023 17:00:06 UTC+1', 4.00, 0.00, 'none'),
    (4, 1, null, 11, 2, '02.01.2023 17:00:07 UTC+1', 2.00, 0.07, 'eust'),
    -- Top Up EC
    (5, 2, null, 3, 11, '01.01.2023 17:00:06 UTC+1', 20.00, 0.00, 'none')
    on conflict do nothing;

insert into bon (
    id, generated, generated_at, error, output_file
)
values
    (0, true, '01.01.2023 15:34:57 UTC+1', null, null),
    (1, false, null, null, null)
    -- transaction 2 would not need a bon, as it is a top up
    on conflict do nothing;

commit;

