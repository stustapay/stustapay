-- migration: f3c8a1b2
-- requires: e4d74d33

create table free_ticket_grant (
    id                  bigint primary key generated always as identity,
    event_node_id       bigint      not null references node (id),
    account_id          bigint      not null references account (id),
    conducting_user_id  bigint      not null references usr (id),
    granted_at          timestamptz not null default now()
);

create index on free_ticket_grant (event_node_id, granted_at);

alter table line_item add column vouchers_redeemed bigint not null default 0;

do
$$
declare
    order_rec record;
    remaining_vouchers bigint;
    line_item_rec record;
    vouchers_for_product bigint;
begin
    for order_rec in
        select t.order_id, t.vouchers as used_vouchers
        from transaction t
        join ordr o on t.order_id = o.id
        where t.order_id is not null
          and t.vouchers > 0
          and o.order_type = 'sale'
    loop
        remaining_vouchers := order_rec.used_vouchers;

        for line_item_rec in
            select li.order_id, li.item_id, li.quantity, p.price_in_vouchers,
                   p.price / p.price_in_vouchers as price_per_voucher
            from line_item li
            join product p on li.product_id = p.id
            where li.order_id = order_rec.order_id
              and p.price_in_vouchers is not null
              and p.price is not null
            order by p.price / p.price_in_vouchers desc nulls last
        loop
            exit when remaining_vouchers <= 0;

            if line_item_rec.price_per_voucher is null then
                continue;
            end if;

            vouchers_for_product := least(
                remaining_vouchers,
                line_item_rec.price_in_vouchers * line_item_rec.quantity
            );

            update line_item
            set vouchers_redeemed = vouchers_for_product
            where order_id = line_item_rec.order_id and item_id = line_item_rec.item_id;

            remaining_vouchers := remaining_vouchers - vouchers_for_product;
        end loop;
    end loop;

    update line_item
    set vouchers_redeemed = -oli.vouchers_redeemed
    from ordr co
    join line_item oli on oli.order_id = co.cancels_order
    where line_item.order_id = co.id
      and line_item.item_id = oli.item_id
      and line_item.product_id = oli.product_id
      and co.order_type = 'cancel_sale';
end
$$;
