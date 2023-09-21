-- return the id-array of a given node id's path,
-- i.e. trace it up to the root.
create or replace function node_trace(
    start_node_id bigint
) returns bigint[] as
$$
<<locals>> declare
    has_cycle boolean;
    trace     bigint[];
    rofl      json;
begin

    -- now for the juicy part - check if we have circular dependencies in clearing account relations
    with recursive search_graph(node_id, depth, path, cycle) as (
        -- base case: start at the requested node
        select
            start_node_id,
            1,
            array [start_node_id],
            false
        union all
        -- add the node's parent to our result set (find the parents for all so-far evaluated nodes)
        select
            node.parent,
            sg.depth + 1,
            node.parent || sg.path,
            node.parent = any (sg.path)
        from
            search_graph sg
            join node on sg.node_id = node.id
        where
            node.id != 0
            and not sg.cycle
                                                                )
    select
        sg.path,
        sg.cycle
    into locals.trace, locals.has_cycle
    from
        search_graph sg
    where
        node_id = 0;

    if locals.has_cycle then raise 'node has cycle: %', locals.trace; end if;

    --     if start_node_id != 0 then
--         raise 'stuff %, %', locals.trace, rofl;
--     end if;

    return locals.trace;
end
$$ language plpgsql
    stable
    set search_path = "$user", public;

create or replace view till_with_cash_register as
    select
        t.*,
        tse.serial,
        cr.name   as current_cash_register_name,
        a.balance as current_cash_register_balance
    from
        till t
        left join usr u on t.active_user_id = u.id
        left join account a on u.cashier_account_id = a.id
        left join cash_register cr on t.active_cash_register_id = cr.id
        left join tse on tse.id = t.tse_id;

create or replace view cash_register_with_cashier as
    select
        c.*,
        t.id                   as current_till_id,
        u.id                   as current_cashier_id,
        u.user_tag_uid         as current_cashier_tag_uid,
        coalesce(a.balance, 0) as current_balance
    from
        cash_register c
        left join usr u on u.cash_register_id = c.id
        left join account a on a.id = u.cashier_account_id
        left join till t on t.active_cash_register_id = c.id;

create or replace view user_role_with_privileges as
    select
        r.*,
        coalesce(privs.privileges, '{}'::text array) as privileges
    from
        user_role r
        left join (
            select ur.role_id, array_agg(ur.privilege) as privileges from user_role_to_privilege ur group by ur.role_id
                  ) privs on r.id = privs.role_id;

create or replace view user_with_roles as
    select
        usr.*,
        coalesce(roles.roles, '{}'::text array) as role_names
    from
        usr
        left join (
            select
                utr.user_id        as user_id,
                array_agg(ur.name) as roles
            from
                user_to_role utr
                join user_role ur on utr.role_id = ur.id
            group by utr.user_id
                  ) roles on usr.id = roles.user_id;

create or replace view user_with_privileges as
    select
        usr.*,
        coalesce(privs.privileges, '{}'::text array) as privileges
    from
        usr
        left join (
            select
                utr.user_id,
                array_agg(urtp.privilege) as privileges
            from
                user_to_role utr
                join user_role_to_privilege urtp on utr.role_id = urtp.role_id
            group by utr.user_id
                  ) privs on usr.id = privs.user_id;

create or replace view account_with_history as
    select
        a.*,
        ut.comment                             as user_tag_comment,
        ut.restriction,
        coalesce(hist.tag_history, '[]'::json) as tag_history
    from
        account a
        left join user_tag ut on a.user_tag_uid = ut.uid
        left join (
            select
                atah.account_id,
                json_agg(json_build_object('account_id', atah.account_id, 'user_tag_uid', atah.user_tag_uid,
                                           'mapping_was_valid_until', atah.mapping_was_valid_until, 'comment',
                                           ut.comment)) as tag_history
            from
                account_tag_association_history atah
                join user_tag ut on atah.user_tag_uid = ut.uid
            group by atah.account_id
                  ) hist on a.id = hist.account_id;

-- aggregates account and customer_info to customer
create or replace view customer as
    select
        a.*,
        customer_info.*
    from
        account_with_history a
        left join customer_info on (a.id = customer_info.customer_account_id)
    where
        a.type = 'private';

create or replace view payout as
    select
        c.node_id,
        c.customer_account_id,
        c.iban,
        c.account_name,
        c.email,
        c.user_tag_uid,
        (c.balance - c.donation) as balance,
        c.payout_run_id
    from
        customer c
    where
        c.iban is not null
        and round(c.balance, 2) > 0
        and round(c.balance - c.donation, 2) > 0
        and c.payout_export
        and c.payout_error is null;

create or replace view payout_run_with_stats as
    select
        p.*,
        s.total_donation_amount,
        s.total_payout_amount,
        s.n_payouts
    from
        payout_run p
        join (
            select
                py.id                                                      as id,
                coalesce(sum(c.donation), 0)                               as total_donation_amount,
                coalesce(sum(c.balance), 0) - coalesce(sum(c.donation), 0) as total_payout_amount,
                count(*)                                                   as n_payouts
            from
                payout_run py
                left join customer c on py.id = c.payout_run_id
            group by py.id
             ) s on p.id = s.id;

create or replace view user_tag_with_history as
    select
        ut.node_id,
        ut.uid                                     as user_tag_uid,
        ut.comment,
        a.id                                       as account_id,
        coalesce(hist.account_history, '[]'::json) as account_history
    from
        user_tag ut
        left join account a on a.user_tag_uid = ut.uid
        left join (
            select
                atah.user_tag_uid,
                json_agg(json_build_object('account_id', atah.account_id, 'mapping_was_valid_until',
                                           atah.mapping_was_valid_until, 'comment', ut.comment)) as account_history
            from
                account_tag_association_history atah
                join user_tag ut on atah.user_tag_uid = ut.uid
            group by atah.user_tag_uid
                  ) hist on ut.uid = hist.user_tag_uid;

create or replace view cashier as
    select
        usr.node_id,
        usr.id,
        usr.login,
        usr.display_name,
        usr.description,
        usr.user_tag_uid,
        usr.transport_account_id,
        usr.cashier_account_id,
        usr.cash_register_id,
        a.balance                                    as cash_drawer_balance,
        coalesce(tills.till_ids, '{}'::bigint array) as till_ids
    from
        usr
        join account a on usr.cashier_account_id = a.id
        left join (
            select
                t.active_user_id as user_id,
                array_agg(t.id)  as till_ids
            from
                till t
            where
                t.active_user_id is not null
            group by t.active_user_id
                  ) tills on tills.user_id = usr.id;

create or replace view product_with_tax_and_restrictions as
    select
        p.*,
        -- price_in_vouchers is never 0 due to constraint product_price_in_vouchers_not_zero
        p.price / p.price_in_vouchers               as price_per_voucher,
        tax.rate                                    as tax_rate,
        coalesce(pr.restrictions, '{}'::text array) as restrictions
    from
        product p
        join tax on p.tax_name = tax.name
        left join (
            select r.id, array_agg(r.restriction) as restrictions from product_restriction r group by r.id
                  ) pr on pr.id = p.id;

create or replace view ticket_with_product as
    select
        t.*,
        p.name                            as product_name,
        p.price,
        p.tax_name,
        p.tax_rate,
        p.target_account_id               as product_target_account_id,
        t.initial_top_up_amount + p.price as total_price
    from
        ticket t
        join product_with_tax_and_restrictions p on t.product_id = p.id;

create or replace view till_button_with_products as
    select
        t.id,
        t.name,
        coalesce(j_view.price, 0)                        as price, -- sane defaults for buttons without a product
        coalesce(j_view.price_in_vouchers, 0)            as price_in_vouchers,
        coalesce(j_view.price_per_voucher, 0)            as price_per_voucher,
        coalesce(j_view.fixed_price, true)               as fixed_price,
        coalesce(j_view.is_returnable, false)            as is_returnable,
        coalesce(j_view.product_ids, '{}'::bigint array) as product_ids
    from
        till_button t
        left join (
            select
                tlb.button_id,
                sum(coalesce(p.price, 0))             as price,

                -- this assumes that only one product can have a voucher value
                -- because we'd need the products individual voucher prices
                -- and start applying vouchers to the highest price_per_voucher product first.
                sum(coalesce(p.price_in_vouchers, 0)) as price_in_vouchers,
                sum(coalesce(p.price_per_voucher, 0)) as price_per_voucher,

                bool_and(p.fixed_price)               as fixed_price,   -- a constraint assures us that for variable priced products a button can only refer to one product
                bool_and(p.is_returnable)             as is_returnable, -- a constraint assures us that for returnable products a button can only refer to one product
                array_agg(tlb.product_id)             as product_ids
            from
                till_button_product tlb
                join product_with_tax_and_restrictions p on tlb.product_id = p.id
            group by tlb.button_id
            window button_window as (partition by tlb.button_id)
                  ) j_view on t.id = j_view.button_id;

create or replace view till_layout_with_buttons_and_tickets as
    select
        t.*,
        coalesce(j_view.button_ids, '{}'::bigint array) as button_ids,
        coalesce(t_view.ticket_ids, '{}'::bigint array) as ticket_ids
    from
        till_layout t
        left join (
            select
                tltb.layout_id,
                array_agg(tltb.button_id order by tltb.sequence_number) as button_ids
            from
                till_layout_to_button tltb
            group by tltb.layout_id
                  ) j_view on t.id = j_view.layout_id
        left join (
            select
                tltt.layout_id,
                array_agg(tltt.ticket_id order by tltt.sequence_number) as ticket_ids
            from
                till_layout_to_ticket tltt
            group by tltt.layout_id
                  ) t_view on t.id = t_view.layout_id;

create or replace view line_item_aggregated_json as
    with line_item_json as (
        select
            l.*,
            row_to_json(p) as product
        from
            line_item as l
            join product_with_tax_and_restrictions p on l.product_id = p.id
    )
    select
        order_id,
        sum(total_price)                                       as total_price,
        sum(total_tax)                                         as total_tax,
        sum(total_price - total_tax)                           as total_no_tax,
        coalesce(json_agg(line_item_json), json_build_array()) as line_items
    from
        line_item_json
    group by
        order_id;

create or replace view order_value as
    select
        ordr.*,
        a.user_tag_uid                              as customer_tag_uid,
        coalesce(li.total_price, 0)                 as total_price,
        coalesce(li.total_tax, 0)                   as total_tax,
        coalesce(li.total_no_tax, 0)                as total_no_tax,
        coalesce(li.line_items, json_build_array()) as line_items
    from
        ordr
        left join line_item_aggregated_json li on ordr.id = li.order_id
        left join account a on ordr.customer_account_id = a.id;

-- show all line items
create or replace view order_items as
    select
        ordr.*,
        line_item.*
    from
        ordr
        left join line_item on (ordr.id = line_item.order_id);

-- aggregated tax rate of items
create or replace view order_tax_rates as
    select
        ordr.*,
        tax_name,
        tax_rate,
        sum(total_price)             as total_price,
        sum(total_tax)               as total_tax,
        sum(total_price - total_tax) as total_no_tax
    from
        ordr
        left join line_item on (ordr.id = order_id)
    group by
        ordr.id, tax_rate, tax_name;

create or replace view order_value_with_bon as
    select
        o.*,
        b.generated   as bon_generated,
        b.output_file as bon_output_file
    from
        order_value o
        left join bon b on (o.id = b.id);

create or replace view till_profile_with_allowed_roles as
    select
        p.*,
        coalesce(roles.role_ids, '{}'::bigint array) as allowed_role_ids,
        coalesce(roles.role_names, '{}'::text array) as allowed_role_names
    from
        till_profile p
        left join (
            select
                a.profile_id,
                array_agg(ur.id)   as role_ids,
                array_agg(ur.name) as role_names
            from
                allowed_user_roles_for_till_profile a
                join user_role ur on a.role_id = ur.id
            group by a.profile_id
                  ) roles on roles.profile_id = p.id;

