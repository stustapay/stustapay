-- stustapay example data
--
-- Add test data to tables in the base schema
-- targets >=postgresql-13

begin;

set plpgsql.extra_warnings to 'all';
set datestyle to 'ISO';

insert into node (
    id, parent, name, description
) overriding system value
values (
    2, 1, 'SSC-Test', 'Test Event'
);

insert into user_tag_secret (
    node_id, id, key0, key1
) overriding system value
values (
    2, 0, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')
)
on conflict do nothing;

insert into user_tag (
    node_id, uid, pin, serial, restriction, secret
)
values (
    2, 1, 'pin', null, null, null
),     -- admin + finanzorga tag
    (
        2, 2, 'pin', null, null, null
    ), -- finanzorga1 tag
    (
        2, 3, 'pin', null, null, null
    ), -- finanzorga2 tag
    (
        2, 4, 'pin', null, null, null
    ), -- finanzorga3 tag
    (
        2, 5, 'pin', null, null, null
    ), -- finanzorga4 tag
    (
        2, 6, 'pin', null, null, null
    )  -- finanzorga5 tag
on conflict do nothing;


insert into account (
    node_id, id, type, user_tag_uid
) overriding system value
values (
    2, 200, 'private', 1
), (
    2, 201, 'private', 2
), (
    2, 202, 'private', 3
), (
    2, 203, 'private', 4
), (
    2, 204, 'private', 5
), (
    2, 205, 'private', 6
)
on conflict do nothing;
select setval('account_id_seq', 300);

insert into usr (
    node_id, id, login, password, description, transport_account_id, cashier_account_id, user_tag_uid,
    customer_account_id
) overriding system value
values
    -- password is admin
    (
        2, 0, 'admin', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Admin user', null, null, 1, 200
    ), (
    2, 1, 'finanzorga1', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 2,
    201
), (
    2, 2, 'finanzorga2', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 3,
    202
), (
    2, 3, 'finanzorga3', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 4,
    203
), (
    2, 4, 'finanzorga4', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 5,
    204
), (
    2, 5, 'finanzorga5', '$2b$12$pic/ICOrv6eOAPDCPvLRuuwYihKbIAlP4MhXa8.ccCHy2IaTSVr0W', 'Finanzorga', null, null, 6,
    205
)
on conflict do nothing;
select setval('usr_id_seq', 100);

insert into user_to_role (
    user_id, role_id
)
values (
    0, 0
),     -- admin
    (
        0, 1
    ), -- finanzorga
    (
        1, 1
    ), -- finanzorga
    (
        2, 1
    ), -- finanzorga
    (
        3, 1
    ), -- finanzorga
    (
        4, 1
    ), -- finanzorga
    (
        5, 1
    )  -- finanzorga
on conflict do nothing;

insert into product (
    node_id, id, name, price, price_in_vouchers, fixed_price, target_account_id, tax_name, is_returnable, is_locked
) overriding system value
values
-- Special Product: id 0-99
-- Pfand
    (
        2, 10, 'Pfand', 2.00, null, true, 2, 'none', true, true
    ),
-- Getränke
    (
        2, 100, 'Helles 1.0l', 5.00, 2, true, null, 'ust', false, true
    ), (
    2, 101, 'Helles 0.5l', 3.00, 1, true, null, 'ust', false, true
), (
    2, 102, 'Weißbier 1.0l', 5.00, 2, true, null, 'ust', false, true
), (
    2, 103, 'Weißbier 0.5l', 3.00, 1, true, null, 'ust', false, true
), (
    2, 104, 'Radler 1.0l', 5.00, 2, true, null, 'ust', false, true
), (
    2, 105, 'Radler 0.5l', 3.00, 1, true, null, 'ust', false, true
), (
    2, 106, 'Russ 1.0l', 5.00, 2, true, null, 'ust', false, true
), (
    2, 107, 'Russ 0.5l', 3.00, 1, true, null, 'ust', false, true
), (
    2, 108, 'Limonade 1.0l', 2.00, 2, true, null, 'ust', false, true
), (
    2, 109, 'Whisky 1.0l', 20.00, 10, true, null, 'ust', false, true
),
-- Essen
    (
        2, 150, 'Weißwurst', 2.00, null, true, null, 'eust', false, true
    ),
-- Freipreis
    (
        2, 160, 'Brotladen', null, null, false, null, 'transparent', false, true
    )
on conflict do nothing;
select setval('product_id_seq', 200);

insert into product_restriction (
    id, restriction
)
values
-- alcohol is not allowed below 16
    (
        100, 'under_16'
    ), (
    101, 'under_16'
), (
    102, 'under_16'
), (
    103, 'under_16'
), (
    104, 'under_16'
), (
    105, 'under_16'
), (
    106, 'under_16'
), (
    107, 'under_16'
),
-- whisky is not allowed below 18 (and thus explicit below 16)
    (
        109, 'under_16'
    ), (
    109, 'under_18'
)
on conflict do nothing;

insert into till_button (
    node_id, id, name
) overriding system value
values (
    2, 0, 'Helles 1,0l'
), (
    2, 1, 'Helles 0,5l'
), (
    2, 2, 'Weißbier 1l'
), (
    2, 3, 'Weißbier 0,5l'
), (
    2, 4, 'Radler 1l'
), (
    2, 5, 'Radler 0,5l'
), (
    2, 6, 'Russ 1l'
), (
    2, 7, 'Russ 0,5l'
), (
    2, 8, 'Limonade 1.0l'
), (
    2, 9, 'Whiskey 1.0l'
), (
    2, 10, 'Pfand'
)
on conflict do nothing;
select setval('till_button_id_seq', 100);

insert into till_button_product (
    button_id, product_id
)
values
-- getränke + pfand
    (
        0, 100
    ), (
    0, 10
), (
    1, 101
), (
    1, 10
), (
    2, 102
), (
    2, 10
), (
    3, 103
), (
    3, 10
), (
    4, 104
), (
    4, 10
), (
    5, 105
), (
    5, 10
), (
    6, 106
), (
    6, 10
), (
    7, 107
), (
    7, 10
), (
    8, 108
), (
    8, 10
), (
    9, 109
), (
    9, 10
), (
    10, 10
)
on conflict do nothing;

insert into ticket (
    node_id, id, name, product_id, initial_top_up_amount
) overriding system value
values (
    2, 0, 'Eintritt', 4, 8
);


insert into till_layout (
    node_id, id, name, description
) overriding system value
values (
    2, 0, 'Bierkasse', 'Allgemeine Bierkasse'
), (
    2, 1, 'Cocktailkasse', 'Allgemeine Cocktailkasse'
), (
    2, 2, 'Aufladekasse', 'Allgemeine Aufladekasse'
), (
    2, 3, 'Eintrittskasse', 'Allgemeine Eintrittskasse'
)
on conflict do nothing;
select setval('till_layout_id_seq', 100);

insert into till_layout_to_button (
    layout_id, button_id, sequence_number
)
values
-- Bierkasse
    (
        0, 0, 0
    ), (
    0, 1, 1
), (
    0, 2, 2
), (
    0, 3, 3
), (
    0, 4, 4
), (
    0, 5, 5
), (
    0, 6, 6
), (
    0, 7, 7
), (
    0, 8, 8
), (
    0, 10, 10
), --pfand
-- Cocktail
    (
        1, 9, 0
    ), (
    1, 10, 2
)
on conflict do nothing;

insert into till_layout_to_ticket (
    layout_id, ticket_id, sequence_number
)
values
    -- Eintrittskasse
    (
        3, 0, 0
    )
on conflict do nothing;

insert into till_profile (
    node_id, id, name, description, layout_id, allow_top_up, allow_cash_out, allow_ticket_sale
) overriding system value
values (
    2, 0, 'Bierkasse', 'Allgemeine Pot Bierkasse', 0, false, false, false
), (
    2, 1, 'Cocktailkasse', 'Cocktailkasse', 1, false, false, false
), (
    2, 2, 'Aufladekasse', 'Aufladekasse', 2, true, true, false
), (
    2, 3, 'Eintrittskasse', 'Eintrittskasse', 3, false, false, true
)
on conflict do nothing;
select setval('till_profile_id_seq', 100);

insert into allowed_user_roles_for_till_profile (
    profile_id, role_id
)
values (
    0, 0
), (
    0, 1
), (
    0, 2
), (
    0, 3
), (
    0, 4
), (
    1, 0
), (
    1, 1
), (
    1, 2
), (
    1, 3
), (
    1, 4
), (
    2, 0
), (
    2, 1
), (
    2, 2
), (
    2, 3
), (
    2, 4
), (
    3, 0
), (
    3, 1
), (
    3, 2
), (
    3, 3
), (
    3, 4
);

insert into tse (
    node_id,
    name,
    serial,
    type,
    ws_url,
    password
)
values (
    2,
    'tse1',
    '84ba2997f8fbf9d0feee48c7ba5812d6d1e37c33fdb11cdb06eb849b1336b1c7',
    'diebold_nixdorf',
    'http://localhost:10001',
    '12345'
);

commit;

