begin;

insert into account
    (sban, balance)
values
    ('lol', 10),
    ('rofl', 30)
on conflict do nothing;

insert into product
    (name, price, category)
values
    ('Bier', 2, 'buy'),
    ('Brezel', 1, 'buy'),
    ('Spezi', 0.5, 'buy'),
    ('Weizen', 2.5, 'buy')
    ('load_10EUR', -10, 'topup')
on conflict do nothing;

insert into booking
    (id, account, created, booked, status)
values
    (1, 1, '2022-01-01', '2022-01-02', 'booked'),
    (2, Null, '2022-04-01', Null, 'pending')
on conflict do nothing;

alter sequence booking_id_seq start with 10;

insert into line_item
    (id, booking, product, amount)
values
    (1,1,1,2),
    (2,1,2,2),
    (3,1,1,-1),

    (4,2,1,1),
    (4,2,2,1)
on conflict do nothing;

alter sequence line_item_id_seq start with 10;

commit;
