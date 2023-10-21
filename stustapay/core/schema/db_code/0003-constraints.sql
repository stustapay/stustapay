alter table usr add constraint login_encoding
    check ( login ~ '[a-zA-Z0-9\-_]+' );

alter table usr add constraint cash_register_need_cashier_acccount
    check (((cash_register_id is not null) and (cashier_account_id is not null)) or cash_register_id is null);

alter table usr add constraint password_or_user_tag_uid_set
    check ((user_tag_uid is not null) or (password is not null));

alter table product add constraint product_vouchers_only_with_fixed_price
    check ( price_in_vouchers is not null and fixed_price or price_in_vouchers is null );

alter table product add constraint product_not_fixed_or_price
    check ( price is not null = fixed_price);

-- should be null to avoid div by zero then
alter table product add constraint product_price_in_vouchers_not_zero
    check ( price_in_vouchers <> 0 );

alter table product_ticket_metadata add constraint initial_top_up_is_positive
    check (initial_top_up_amount >= 0);

alter table cash_register_stocking add constraint non_negative_stockings
    check (euro200 >= 0 and euro100 >= 0 and euro50 >= 0 and euro20 >= 0 and
           euro10 >= 0 and euro5 >= 0 and euro2 >= 0 and euro1 >= 0 and
           cent50 >= 0 and cent20 >= 0 and cent10 >= 0 and cent5 >= 0 and
           cent2 >= 0 and cent1 >= 0 and variable_in_euro >= 0);

alter table till add constraint user_requires_role
    check ((active_user_id is null) = (active_user_role_id is null));

alter table till add constraint registration_or_session_uuid_null
    check ((registration_uuid is null) != (session_uuid is null));

alter table till add constraint virtual_till_cannot_be_registered
    check ((id = 1 and session_uuid is null) or id != 1);

alter table ordr add constraint only_cancel_orders_can_reference_orders
    check ((order_type != 'cancel_sale') = (cancels_order is null));

alter table ordr add constraint cash_orders_need_cash_register
    check ((payment_method = 'cash' and cash_register_id is not null)
            or (payment_method != 'cash' and cash_register_id is null));

alter table ordr add constraint till_required_for_non_online_orders
    check ((payment_method = 'sumup_online' and cashier_id is null)
            or (payment_method != 'sumup_online' and cashier_id is not null));

alter table line_item add constraint quantity_not_zero check ( quantity != 0 );

alter table transaction add constraint conducting_user_id_or_order_is_set
    check ((order_id is null) != (conducting_user_id is null));
alter table transaction add constraint source_target_account_different
    check (source_account != target_account);
alter table transaction add constraint amount_positive
    check (amount >= 0);
alter table transaction add constraint vouchers_positive
    check (vouchers >= 0);

alter table tse_signature add constraint result_message_set
    check ((result_message is null) = (signature_status = 'new' or signature_status = 'pending'));
alter table tse_signature add constraint tse_id_set
    check ((tse_id is null) = (signature_status = 'new'));
alter table tse_signature add constraint transaction_process_type_set
    check ((transaction_process_type is not null) = (signature_status = 'done'));
alter table tse_signature add constraint transaction_process_data_set
    check ((transaction_process_data is not null) = (signature_status = 'done'));
alter table tse_signature add constraint tse_transaction_set
    check ((tse_transaction is not null) = (signature_status = 'done'));
alter table tse_signature add constraint tse_signaturenr_set
    check ((tse_signaturenr is not null) = (signature_status = 'done'));
alter table tse_signature add constraint tse_start_set
    check ((tse_start is not null) = (signature_status = 'done'));
alter table tse_signature add constraint tse_end_set
    check ((tse_end is not null) = (signature_status = 'done'));
alter table tse_signature add constraint tse_signature_set
    check ((tse_signature is not null) = (signature_status = 'done'));

alter table customer_info add constraint donation_positive check (donation >= 0);

create or replace function check_button_references_locked_products(
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    is_locked boolean;
begin
    select
        product.is_locked
    into locals.is_locked
    from
        product
    where
        id = check_button_references_locked_products.product_id;
    return locals.is_locked;
end
$$ language plpgsql
    set search_path = "$user", public;

create or replace function check_button_references_max_one_non_fixed_price_product(
    button_id bigint,
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    n_variable_price_products  int;
    new_product_is_fixed_price boolean;
begin
    select
        count(*)
    into locals.n_variable_price_products
    from
        till_button_product tlb
        join product p on tlb.product_id = p.id
    where
            tlb.button_id = check_button_references_max_one_non_fixed_price_product.button_id
        and not p.fixed_price;

    select
        product.fixed_price
    into locals.new_product_is_fixed_price
    from
        product
    where
        id = check_button_references_max_one_non_fixed_price_product.product_id;

    return (locals.n_variable_price_products + (not locals.new_product_is_fixed_price)::int) <= 1;
end
$$ language plpgsql
    set search_path = "$user", public;

create or replace function check_button_references_max_one_returnable_product(
    button_id bigint,
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    n_returnable_products     int;
    new_product_is_returnable boolean;
begin
    select
        count(*)
    into locals.n_returnable_products
    from
        till_button_product tlb
        join product p on tlb.product_id = p.id
    where
            tlb.button_id = check_button_references_max_one_returnable_product.button_id
        and p.is_returnable;

    select
        product.is_returnable
    into locals.new_product_is_returnable
    from
        product
    where
        id = check_button_references_max_one_returnable_product.product_id;

    return (locals.n_returnable_products + locals.new_product_is_returnable::int) <= 1;
end
$$ language plpgsql
    set search_path = "$user", public;

create or replace function check_button_references_max_one_voucher_product(
    button_id bigint,
    product_id bigint
) returns boolean as
$$
<<locals>> declare
    n_voucher_products       int;
    new_product_has_vouchers boolean;
begin
    select
        count(*)
    into locals.n_voucher_products
    from
        till_button_product tlb
        join product p on tlb.product_id = p.id
    where
            tlb.button_id = check_button_references_max_one_voucher_product.button_id
        and p.price_in_vouchers is not null;

    select
        product.price_in_vouchers is not null
    into locals.new_product_has_vouchers
    from
        product
    where
        id = check_button_references_max_one_voucher_product.product_id;

    return (locals.n_voucher_products + locals.new_product_has_vouchers::int) <= 1;
end
$$ language plpgsql
    set search_path = "$user", public;


alter table till_button_product add constraint references_only_locked_products
    check (check_button_references_locked_products(product_id));

alter table till_button_product add constraint references_max_one_variable_price_product
    check (check_button_references_max_one_non_fixed_price_product(button_id, product_id));

alter table till_button_product add constraint references_max_one_returnable_product
    check (check_button_references_max_one_returnable_product(button_id, product_id));

alter table till_button_product add constraint references_max_one_voucher_product
    check (check_button_references_max_one_voucher_product(button_id, product_id));

create or replace function check_till_layout_contains_tickets_of_unique_restrictions(
    layout_id bigint,
    ticket_id bigint
) returns boolean as
$$
<<locals>> declare
    restrictions            text[];
    n_current_tickets_in_layout int;
begin
    select
        t.restrictions
    into locals.restrictions
    from
        ticket t
    where
        t.id = check_till_layout_contains_tickets_of_unique_restrictions.ticket_id;

    if array_length(locals.restrictions, 1) > 1 then
        raise 'ticket in till layout has more than one restriction set';
    end if;

    select
        count(*)
    into locals.n_current_tickets_in_layout
    from
        ticket t
        join till_layout_to_ticket tltt on t.id = tltt.ticket_id
    where
            t.id != check_till_layout_contains_tickets_of_unique_restrictions.ticket_id
        and tltt.layout_id = check_till_layout_contains_tickets_of_unique_restrictions.layout_id
        and (t.restrictions = locals.restrictions);

    return locals.n_current_tickets_in_layout < 1;
end
$$ language plpgsql
    set search_path = "$user", public;

alter table till_layout_to_ticket add constraint unique_restriction_ticket_per_layout
    check (check_till_layout_contains_tickets_of_unique_restrictions(layout_id, ticket_id));

-- not null constraints do not work if the data is populated by a pre insert trigger, constraints are
-- checked before any trigger runs
-- alter table node add constraint path_not_null check (path is not null);
-- alter table node add constraint parent_ids_not_null check (parent_ids is not null);
alter table node add constraint name_is_unicode_nfc check (name is nfc normalized);
alter table node add constraint name_no_slash check (strpos(name, '/') = 0);
alter table node add constraint selfreference_only_root check (
    -- only the root may reference itself as tree termination
    (parent = id) = (id = 0)
);
