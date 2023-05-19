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
    (1, 'pin', null, null, null), -- admin + finanzorga tag
    (2, 'pin', null, null, null), -- finanzorga1 tag
    (3, 'pin', null, null, null), -- finanzorga2 tag
    (4, 'pin', null, null, null), -- finanzorga3 tag
    (5, 'pin', null, null, null), -- finanzorga4 tag
    (6, 'pin', null, null, null)  -- finanzorga5 tag
on conflict do nothing;



insert into usr (
    id, login, password, description, transport_account_id, cashier_account_id, user_tag_uid
) overriding system value
values
    -- password is admin
    (0, 'admin', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Admin user', null, null, 1),
    (1, 'finanzorga1', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 2),
    (2, 'finanzorga2', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 3),
    (3, 'finanzorga3', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 4),
    (4, 'finanzorga4', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 5),
    (5, 'finanzorga5', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 6)
on conflict do nothing;
select setval('usr_id_seq', 100);

insert into user_to_role (
    user_id, role_id
)
values
    (0, 0), -- admin
    (0, 1), -- finanzorga
    (1, 1), -- finanzorga
    (2, 1), -- finanzorga
    (3, 1), -- finanzorga
    (4, 1), -- finanzorga
    (5, 1)  -- finanzorga
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
    (160, 'Brotladen', null, null, false, null, 'transparent', false, true)
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
    (0, 'Helles 1,0l'),
    (1, 'Helles 0,5l'),
    (2, 'Weißbier 1l'),
    (3, 'Weißbier 0,5l'),
    (4, 'Radler 1l'),
    (5, 'Radler 0,5l'),
    (6, 'Russ 1l'),
    (7, 'Russ 0,5l'),
    (8, 'Limonade 1.0l'),
    (9, 'Whiskey 1.0l'),
    (10, 'Pfand')
on conflict do nothing;
select setval('till_button_id_seq', 100);

insert into till_button_product (
    button_id, product_id
)  values
    -- getränke + pfand
    (0, 100),
    (0, 10),
    (1, 101),
    (1, 10),
    (2, 102),
    (2, 10),
    (3, 103),
    (3, 10),
    (4, 104),
    (4, 10),
    (5, 105),
    (5, 10),
    (6, 106),
    (6, 10),
    (7, 107),
    (7, 10),
    (8, 108),
    (8, 10),
    (9, 109),
    (9, 10),
    (10, 10)
on conflict do nothing;

insert into ticket (
    id, name, product_id, initial_top_up_amount
) overriding system value
values
    (0, 'Eintritt', 4, 8);


insert into till_layout (
    id, name, description
) overriding system value
values
    (0, 'Bierkasse', 'Allgemeine Bierkasse'),
    (1, 'Cocktailkasse', 'Allgemeine Cocktailkasse'),
    (2, 'Aufladekasse', 'Allgemeine Aufladekasse'),
    (3, 'Eintrittskasse', 'Allgemeine Eintrittskasse')
on conflict do nothing;
select setval('till_layout_id_seq', 100);

insert into till_layout_to_button (
    layout_id, button_id, sequence_number
) values
      -- Bierkasse
      (0, 0, 0),
      (0, 1, 1),
      (0, 2, 2),
      (0, 3, 3),
      (0, 4, 4),
      (0, 5, 5),
      (0, 6, 6),
      (0, 7, 7),
      (0, 8, 8),
      (0, 10, 10), --pfand
      -- Cocktail
      (1, 9, 0),
      (1, 10, 2)
on conflict do nothing;

insert into till_layout_to_ticket (
    layout_id, ticket_id, sequence_number
) values
      -- Eintrittskasse
      (3, 0, 0)
on conflict do nothing;

insert into till_profile (
    id, name, description, layout_id, allow_top_up, allow_cash_out, allow_ticket_sale
) overriding system value
values
    (0, 'Bierkasse', 'Allgemeine Pot Bierkasse', 0, false, false, false),
    (1, 'Cocktailkasse', 'Cocktailkasse', 1, false, false, false),
    (2, 'Aufladekasse', 'Aufladekasse', 2, true, true, false),
    (3, 'Eintrittskasse', 'Eintrittskasse', 3, false, false, true)
on conflict do nothing;
select setval('till_profile_id_seq', 100);

insert into allowed_user_roles_for_till_profile (profile_id, role_id)
values
    (0, 0),
    (0, 1),
    (0, 2),
    (0, 3),
    (0, 4),
    (1, 0),
    (1, 1),
    (1, 2),
    (1, 3),
    (1, 4),
    (2, 0),
    (2, 1),
    (2, 2),
    (2, 3),
    (2, 4),
    (3, 0),
    (3, 1),
    (3, 2),
    (3, 3),
    (3, 4);

insert into tse (tse_name) values ('tse1');

commit;

