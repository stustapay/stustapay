-- return the id-array of a given node id's path,
-- i.e. trace it up to the root.
create or replace function node_trace(
    start_node_id bigint,
    start_node_name text,
    start_node_parent_id bigint,
    start_node_is_event boolean
) returns table (
    parent_ids bigint[],
    event_node_id bigint,
    parents_until_event_node bigint[]
) as
$$
<<locals>> declare
    has_cycle                   boolean;
    trace                       bigint[];
    n_events_in_trace           int;
    event_node_id               bigint;
    parents_until_event_node    bigint[];
    name_is_unique              bool;
begin

    with recursive search_graph (node_id, depth, path, cycle, n_events_in_trace, event_node_id, parents_until_event_node, node_names, name_is_unique) as (
        -- base case: start at the requested node
        select
            start_node_parent_id,
            1,
            array[start_node_parent_id],
            false,
            case when start_node_is_event then 1 else 0 end,
            case when start_node_is_event then start_node_id else null end,
            case when start_node_is_event then array[]::bigint[] else array[start_node_parent_id] end,
            array[start_node_name],
            true
        union all
        -- add the node's parent to our result set (find the parents for all so-far evaluated nodes)
        select
            node.parent,
            sg.depth + 1,
            node.parent || sg.path,
            node.parent = any(sg.path),
            sg.n_events_in_trace + (case when node.event_id is not null then 1 else 0 end),
            coalesce(sg.event_node_id, case when node.event_id is not null then node.id else null end),
            case when node.event_id is not null or sg.event_node_id is not null then sg.parents_until_event_node else node.parent || sg.parents_until_event_node end,
            node.name || sg.node_names,
            node.name != any(sg.node_names)
        from
            search_graph sg
            join node on sg.node_id = node.id
        where
            node.id != 0
            and not sg.cycle
    )
    select
        sg.path,
        sg.cycle,
        sg.n_events_in_trace,
        sg.event_node_id,
        case when sg.event_node_id is null then null else sg.parents_until_event_node end,
        sg.name_is_unique
    into
        locals.trace, locals.has_cycle, locals.n_events_in_trace, locals.event_node_id, locals.parents_until_event_node, locals.name_is_unique
    from
        search_graph sg
    where
        node_id = 0;

    if locals.n_events_in_trace > 1 then
        raise 'events cannot be children of other events';
    end if;

    if locals.has_cycle then
        raise 'node has cycle: %', locals.trace;
    end if;

    if not locals.name_is_unique then
        raise 'node name is not unique in subtree';
    end if;

    return query select locals.trace as parent_ids, locals.event_node_id, locals.parents_until_event_node;
end
$$ language plpgsql
    stable
    set search_path = "$user", public;

-- whenever a new node is inserted, calculate its path.
-- when parent is updated, recalculate the path.
create or replace function update_node_path() returns trigger as
$$
<<locals>> declare
    parent_ids                  bigint[];
    event_node_id               bigint;
    parents_until_event_node    bigint[];
begin
    select
        n.parent_ids,
        n.event_node_id,
        n.parents_until_event_node
        into locals.parent_ids, locals.event_node_id, locals.parents_until_event_node
    from node_trace(NEW.id, NEW.name, NEW.parent, NEW.event_id is not null) n;
    NEW.parent_ids := locals.parent_ids;
    NEW.event_node_id := locals.event_node_id;
    NEW.parents_until_event_node := locals.parents_until_event_node;
    NEW.path := '/' || array_to_string(NEW.parent_ids || array[NEW.id], '/');

    return NEW;
end
$$ language plpgsql
    stable
    set search_path = "$user", public;

create trigger update_trace_trigger
    before insert
    on node
    for each row
execute function update_node_path();

create or replace function check_node_update() returns trigger as
$$
begin
    perform node_trace(NEW.id, NEW.name, NEW.parent, NEW.event_id is not null);
    return NEW;
end
$$ language plpgsql
    stable
    set search_path = "$user", public;

create trigger check_node_update
    before update
    on node
    for each row
    when (OLD.event_id is distinct from NEW.event_id)
execute function check_node_update();

create or replace function user_to_role_updated() returns trigger
    set search_path = "$user", public
    language plpgsql as
$$
<<locals>> declare
    user_node_id          bigint;
    user_is_outside_event bool;
    event_node_id         bigint;
    role_privileges       text[];
    user_login            text;
    transport_account_id  bigint;
begin
    select
        ur.privileges
    into locals.role_privileges
    from
        user_role_with_privileges ur
    where
        id = NEW.role_id;

    select
        u.node_id,
        n.event_node_id is null
    into locals.user_node_id, locals.user_is_outside_event
    from
        usr u
    join node n on u.node_id = n.id
    where
        u.id = NEW.user_id;

    select node.event_node_id into locals.event_node_id
    from node
    where node.id = NEW.node_id;

    -- TODO: this will not create cashier / transport accounts for users defined above event nodes (which makes sense)
    if locals.event_node_id is null or locals.user_is_outside_event then
        return NEW;
    end if;

    select
        usr.transport_account_id,
        usr.login
    into locals.transport_account_id, locals.user_login
    from
        usr
    where
        id = NEW.user_id;

    -- TODO: use a better privilege
    if 'cash_transport' = any (locals.role_privileges) then
        if locals.transport_account_id is null then
            insert into account (
                node_id, type, name
            )
            values (
                locals.event_node_id, 'transport', 'transport account for ' || locals.user_login
            )
            returning id into locals.transport_account_id;

            update usr set transport_account_id = locals.transport_account_id where id = NEW.user_id;
        end if;
    end if;

    return NEW;
end
$$;

drop trigger if exists user_to_role_updated_trigger on user_to_role;
create trigger user_to_role_updated_trigger
    after insert
    on user_to_role
    for each row
execute function user_to_role_updated();

create or replace function check_account_balance() returns trigger as
$$
<<locals>> declare
    new_balance numeric;
    max_balance numeric;
begin
    select value::numeric into locals.max_balance from config where key = 'max_account_balance';

    -- Since this constraint function runs at the end of a db transaction we need to fetch the current balance
    -- from the table manually. If we were to use NEW.balance we'd still have the old balance at the time of
    -- the insert / update.
    select balance into locals.new_balance from account where id = NEW.id;

    if NEW.type = 'private' and locals.new_balance > locals.max_balance then
        raise 'Customers can have a maximum balance of at most %. New balance would be %.', locals.max_balance, locals.new_balance;
    end if;

    if NEW.type = 'private' and locals.new_balance < 0 then
        raise 'Customers cannot have a negative balance. New balance would be %.', locals.new_balance;
    end if;

    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

-- we need to use a constraint trigger for the balance check as normal table level check constraints do not support
-- the deferrable initially deferred setting
create constraint trigger max_balance_limited
    after insert or update
    on account deferrable initially deferred
    for each row
execute function check_account_balance();

create or replace function update_tag_association_history() returns trigger as
$$
begin
    -- this check is already done in the trigger definition but still included here as to not forget it in the future
    if NEW.user_tag_id = OLD.user_tag_id or OLD.user_tag_id is null then return NEW; end if;
    insert into account_tag_association_history (
        account_id, user_tag_id
    )
    values (
        NEW.id, OLD.user_tag_id
    );
    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists update_tag_association_history_trigger on account;
create trigger update_tag_association_history_trigger
    after update of user_tag_id
    on account
    for each row
    when (OLD.user_tag_id is distinct from NEW.user_tag_id and OLD.user_tag_id is not null)
execute function update_tag_association_history();

create or replace function handle_till_cash_register_change() returns trigger as
$$
<<locals>> declare
    cash_register_balance           numeric;
    order_id                        bigint;
    tax_rate_none_id                bigint;
    money_transfer_product_id       bigint;
    cash_register_id                bigint;
    logged_in_cashier               bigint;
begin
    select t.id into locals.tax_rate_none_id
    from tax_rate t join node n on t.node_id = n.event_node_id
    where n.id = NEW.node_id and t.name = 'none';
    if locals.tax_rate_none_id is null then
        raise 'Could not find tax rate "none" for current node';
    end if;

    select p.id into locals.money_transfer_product_id
    from product p join node n on p.node_id = n.event_node_id
    where n.id = NEW.node_id and p.type = 'money_transfer';
    if locals.money_transfer_product_id is null then
        raise 'Could not find money transfer product for current node';
    end if;

    if NEW.active_cash_register_id is null then
        locals.cash_register_id := OLD.active_cash_register_id;
        select t.active_user_id into locals.logged_in_cashier
        from terminal t where t.id = OLD.terminal_id;
    else
        locals.cash_register_id := NEW.active_cash_register_id;
        select t.active_user_id into locals.logged_in_cashier
        from terminal t where t.id = NEW.terminal_id;
    end if;

    select
        c.balance
    into locals.cash_register_balance
    from
        cash_register_with_balance c
    where
        c.id = locals.cash_register_id;

    if NEW.active_cash_register_id is null then
        if locals.cash_register_balance != 0 then
            insert into ordr (
                item_count, payment_method, order_type, cashier_id, till_id, cash_register_id, z_nr
            )
            values (
                1, 'cash', 'money_transfer', locals.logged_in_cashier, OLD.id, locals.cash_register_id, OLD.z_nr
            )
            returning id into locals.order_id;

            insert into line_item (
                order_id, item_id, product_id, product_price, quantity, tax_rate_id, tax_name, tax_rate
            )
            values (
                locals.order_id, 0, locals.money_transfer_product_id, -locals.cash_register_balance, 1, locals.tax_rate_none_id, 'none', 0
            );
        end if;
    else
        insert into ordr (
            item_count, payment_method, order_type, cashier_id, till_id, cash_register_id, z_nr
        )
        values (
            1, 'cash', 'money_transfer', locals.logged_in_cashier, NEW.id, locals.cash_register_id, NEW.z_nr
        )
        returning id into locals.order_id;

        insert into line_item (
            order_id, item_id, product_id, product_price, quantity, tax_rate_id, tax_name, tax_rate
        )
        values (
            locals.order_id, 0, locals.money_transfer_product_id, locals.cash_register_balance, 1, locals.tax_rate_none_id, 'none', 0
        );
    end if;

    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists handle_till_cash_register_change_trigger on till;
create trigger handle_till_cash_register_change_trigger
    before update of active_cash_register_id
    on till
    for each row
    when (OLD.active_cash_register_id is distinct from NEW.active_cash_register_id)
execute function handle_till_cash_register_change();

create or replace function handle_terminal_active_user_change() returns trigger as
$$
<<locals>> declare
    till_id bigint;
    current_znr bigint;
    n_orders_booked bigint;
begin
    if NEW.active_user_id is null then
        return NEW;
    end if;

    select t.id, t.z_nr into locals.till_id, locals.current_znr
    from till t where t.terminal_id = NEW.id;

    if locals.till_id is null then
        return NEW;
    end if;

    select count(*) into locals.n_orders_booked from ordr o
    where o.z_nr = locals.current_znr and o.till_id = locals.till_id;

    if locals.n_orders_booked > 0 then
        update till set z_nr = z_nr + 1 where id = locals.till_id;
    end if;

    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists handle_terminal_active_user_change_trigger on terminal;
create trigger handle_terminal_active_user_change_trigger
    after update of active_user_id
    on terminal
    for each row
    when (OLD.active_user_id is distinct from NEW.active_user_id)
execute function handle_terminal_active_user_change();

create or replace function deny_in_trigger() returns trigger
    language plpgsql as
$$
begin
    return null;
end;
$$;

drop trigger if exists till_tse_history_deny_update_delete on till_tse_history;
create trigger till_tse_history_deny_update_delete
    before update or delete
    on till_tse_history
    for each row
execute function deny_in_trigger();

create or replace function new_order_added() returns trigger as
$$
begin
    if NEW is null then
        return null;
    end if;

    if NEW.order_type = 'cashier_shift_start' or NEW.order_type = 'cashier_shift_end' then
        return NEW;
    end if;

    -- insert a new tse signing request and notify for it
    insert into tse_signature(
        id
    )
    values (
        NEW.id
    );
    perform pg_notify('tse_signature', NEW.id::text);

    -- send general notifications, used e.g. for instant UI updates
    perform pg_notify('order',
                      json_build_object('order_id', NEW.id, 'order_uuid', NEW.uuid, 'cashier_id', NEW.cashier_id,
                                        'till_id', NEW.till_id)::text);

    return NEW;
end;
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists new_order_trigger on ordr;
create trigger new_order_trigger
    after insert
    on ordr
    for each row
execute function new_order_added();

create or replace function tse_signature_update_trigger_procedure() returns trigger as
$$
begin
    NEW.last_update = now();
    return NEW;
end;
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists tse_signature_update_trigger on tse_signature;
create trigger tse_signature_update_trigger
    before update
    on tse_signature
    for each row
execute function tse_signature_update_trigger_procedure();

-- notify the bon generator about a new job
create or replace function tse_signature_finished_trigger_procedure() returns trigger as
$$
begin
    insert into bon(
        id
    )
    values (
        NEW.id
    );
    perform pg_notify('bon', json_build_object('bon_id', NEW.id)::text);

    return NEW;
end;
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists tse_signature_finished_trigger on till;
create trigger tse_signature_finished_trigger
    after update of signature_status
    on tse_signature
    for each row
    when (NEW.signature_status = 'done' or NEW.signature_status = 'failure')
execute function tse_signature_finished_trigger_procedure();

create or replace function update_account_user_tag_association_to_user() returns trigger as
$$
<<locals>> declare
    user_user_tag_id bigint;
begin
    select usr.user_tag_id into locals.user_user_tag_id
    from usr where usr.customer_account_id = NEW.id;

    if locals.user_user_tag_id is distinct from NEW.user_tag_id then
        update usr set user_tag_id = NEW.user_tag_id where usr.customer_account_id = NEW.id;
    end if;

    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

create or replace function update_user_tag_association_to_account() returns trigger as
$$
<<locals>> declare
    account_user_tag_id bigint;
begin
    select a.user_tag_id into locals.account_user_tag_id
    from account a where a.id = NEW.customer_account_id;

    if locals.account_user_tag_id is distinct from NEW.user_tag_id then
        update account set user_tag_id = NEW.user_tag_id where id = NEW.customer_account_id;
    end if;

    return NEW;
end
$$ language plpgsql set search_path = "$user", public;

drop trigger if exists update_user_tag_association_to_account_trigger on usr;
create trigger update_user_tag_association_to_account_trigger
    after update on usr
    for each row
    when (OLD.user_tag_id is distinct from NEW.user_tag_id)
execute function update_user_tag_association_to_account();

-- there was an error where this trigger was initially set on the 'usr' table
drop trigger if exists update_account_user_tag_association_to_user_trigger on usr;
create trigger update_account_user_tag_association_to_user_trigger
    after update on account
    for each row
    when (OLD.user_tag_id is distinct from NEW.user_tag_id)
execute function update_account_user_tag_association_to_user();

create function noupdate() returns trigger as
$$
begin
    raise exception 'not allowed';
end;
$$ language plpgsql set search_path = "$user", public;

-- for now, don't allow tree moves. this would require updating
-- all cached paths of affected nodes, but is way more complicated
-- because moves of tree elements have very specific constraints.
-- for example moving tills away from their associated event.
drop trigger if exists prevent_parent_change_trigger on node;
create trigger prevent_parent_change_trigger
    before update of parent, path, parent_ids
    on node
    for each row
    when (OLD.parent is distinct from NEW.parent)
execute function noupdate();


-- creates a customer_info record for account with type private when it is created
create or replace function create_customer_info() returns trigger as
$$
begin
    insert into customer_info (customer_account_id) values (NEW.id);
    return NEW;
end
$$ language plpgsql set search_path = "$user", public;

drop trigger if exists create_customer_info_trigger on account;
create trigger create_customer_info_trigger
    after insert
    on account
    for each row
    when (NEW.type = 'private')
execute function create_customer_info();
