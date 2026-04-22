-- migration: 0000047
-- requires: 0000046

do $migration$
begin
    -- Fresh databases load db_code after migrations, so the order_value view row type is not available yet.
    -- Existing databases already have db_code loaded and need the function replaced during migration.
    if to_regclass('order_value') is not null then
        execute $function$
            create or replace function order_value_prefiltered(
                order_ids bigint[],
                event_node_id bigint
            ) returns setof order_value as
            $$
            begin
                -- this needs to be kept in sync with order_value
                return query select
                    ordr.*,
                    ut.uid                                      as customer_tag_uid,
                    ut.id                                       as customer_tag_id,
                    coalesce(li.total_price, 0)                 as total_price,
                    coalesce(li.total_tax, 0)                   as total_tax,
                    coalesce(li.total_no_tax, 0)                as total_no_tax,
                    coalesce(li.line_items, json_build_array()) as line_items
                from ordr
                    join till on ordr.till_id = till.id
                    join node on till.node_id = node.id
                    left join line_item_aggregated_json li
                        ON ordr.id = li.order_id and li.order_id = any(order_value_prefiltered.order_ids)
                    left join account a on ordr.customer_account_id = a.id
                    left join user_tag ut on a.user_tag_id = ut.id
                    where ordr.id = any(order_value_prefiltered.order_ids)
                      and node.event_node_id = order_value_prefiltered.event_node_id;
            end;
            $$ language plpgsql
                set search_path = "$user", public;
        $function$;
    end if;
end
$migration$;
