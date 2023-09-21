create or replace function user_to_role_updated() returns trigger
    set search_path = "$user", public
    language plpgsql as
$$
<<locals>> declare
    node_id              bigint;
    role_privileges      text[];
    user_login           text;
    cashier_account_id   bigint;
    transport_account_id bigint;
begin
    select
        ur.node_id,
        ur.privileges
    into locals.node_id, locals.role_privileges
    from
        user_role_with_privileges ur
    where
        id = NEW.role_id;

    select
        usr.cashier_account_id,
        usr.transport_account_id,
        usr.login
    into locals.cashier_account_id, locals.transport_account_id, locals.user_login
    from
        usr
    where
        id = NEW.user_id;

    -- TODO: do not use role names here and instead use privileges
    if 'can_book_orders' = any (locals.role_privileges) then
        if locals.cashier_account_id is null then
            insert into account (
                node_id, type, name
            )
            values (
                locals.node_id, 'internal', 'cashier account for ' || locals.user_login
            )
            returning id into locals.cashier_account_id;

            update usr set cashier_account_id = locals.cashier_account_id where id = NEW.user_id;
        end if;
    end if;
    -- TODO: use a better privilege
    if 'cashier_management' = any (locals.role_privileges) then
        if locals.transport_account_id is null then
            insert into account (
                node_id, type, name
            )
            values (
                locals.node_id, 'internal', 'transport account for ' || locals.user_login
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
    if NEW.user_tag_uid = OLD.user_tag_uid or OLD.user_tag_uid is null then return NEW; end if;
    insert into account_tag_association_history (
        account_id, user_tag_uid
    )
    values (
        NEW.id, OLD.user_tag_uid
    );
    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists update_tag_association_history_trigger on account;
create trigger update_tag_association_history_trigger
    after update of user_tag_uid
    on account
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid and OLD.user_tag_uid is not null)
execute function update_tag_association_history();

create or replace function handle_till_user_login() returns trigger as
$$
<<locals>> declare
    old_cashier_account_id    bigint;
    old_cash_register_id      bigint;
    old_cash_register_balance numeric;
    old_order_id              bigint;
    n_orders_booked           bigint;
    new_cashier_account_id    bigint;
    new_cash_register_id      bigint;
    new_cash_register_balance numeric;
    new_order_id              bigint;
begin
    NEW.active_cash_register_id := null;

    if NEW.active_user_id is not null then
        select
            usr.cash_register_id,
            usr.cashier_account_id,
            a.balance
        into locals.new_cash_register_id, locals.new_cashier_account_id, locals.new_cash_register_balance
        from
            usr
            join account a on usr.cashier_account_id = a.id
        where
            usr.id = NEW.active_user_id;

        select count(*) into locals.n_orders_booked from ordr where z_nr = NEW.z_nr and till_id = NEW.id;

        if locals.n_orders_booked > 0 then NEW.z_nr := NEW.z_nr + 1; end if;

        if locals.new_cash_register_id is not null then
            insert into ordr (
                item_count, payment_method, order_type, cashier_id, till_id, cash_register_id, z_nr
            )
            values (
                1, 'cash', 'money_transfer', NEW.active_user_id, NEW.id, locals.new_cash_register_id, NEW.z_nr
            )
            returning id into locals.new_order_id;

            insert into line_item (
                order_id, item_id, product_id, product_price, quantity, tax_name, tax_rate
            )
            values (
                locals.new_order_id, 0, 7, locals.new_cash_register_balance, 1, 'none', 0
            );
            NEW.active_cash_register_id := locals.new_cash_register_id;
        end if;
    end if;

    if OLD.active_user_id is not null then
        select
            usr.cash_register_id,
            usr.cashier_account_id,
            a.balance
        into locals.old_cash_register_id, locals.old_cashier_account_id, locals.old_cash_register_balance
        from
            usr
            join account a on usr.cashier_account_id = a.id
        where
            usr.id = OLD.active_user_id;

        if locals.old_cash_register_id is not null and locals.old_cash_register_balance != 0 then
            insert into ordr (
                item_count, payment_method, order_type, cashier_id, till_id, cash_register_id, z_nr
            )
            values (
                1, 'cash', 'money_transfer', OLD.active_user_id, OLD.id, locals.old_cash_register_id, OLD.z_nr
            )
            returning id into locals.old_order_id;

            insert into line_item (
                order_id, item_id, product_id, product_price, quantity, tax_name, tax_rate
            )
            values (
                locals.old_order_id, 0, 7, -locals.old_cash_register_balance, 1, 'none', 0
            );
        end if;
    end if;

    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

drop trigger if exists handle_till_user_login_trigger on till;
create trigger handle_till_user_login_trigger
    before update of active_user_id
    on till
    for each row
    when (OLD.active_user_id is distinct from NEW.active_user_id)
execute function handle_till_user_login();

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
    if NEW is null then return null; end if;

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
    user_user_tag_uid numeric(20);
begin
    select usr.user_tag_uid into locals.user_user_tag_uid
    from usr where usr.customer_account_id = NEW.id;

    if locals.user_user_tag_uid is distinct from NEW.user_tag_uid then
        update usr set user_tag_uid = NEW.user_tag_uid where usr.customer_account_id = NEW.id;
    end if;

    return NEW;
end
$$ language plpgsql
    set search_path = "$user", public;

create or replace function update_user_tag_association_to_account() returns trigger as
$$
<<locals>> declare
    account_user_tag_uid numeric(20);
begin
    select a.user_tag_uid into locals.account_user_tag_uid
    from account a where a.id = NEW.customer_account_id;

    if locals.account_user_tag_uid is distinct from NEW.user_tag_uid then
        update account set user_tag_uid = NEW.user_tag_uid where id = NEW.customer_account_id;
    end if;

    return NEW;
end
$$ language plpgsql set search_path = "$user", public;

drop trigger if exists update_user_tag_association_to_account_trigger on usr;
create trigger update_user_tag_association_to_account_trigger
    after update on usr
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid)
execute function update_user_tag_association_to_account();

-- there was an error where this trigger was initially set on the 'usr' table
drop trigger if exists update_account_user_tag_association_to_user_trigger on usr;
create trigger update_account_user_tag_association_to_user_trigger
    after update on account
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid)
execute function update_account_user_tag_association_to_user();

-- whenever a new node is inserted, calculate its path.
-- when parent is updated, recalculate the path.
create or replace function update_node_path() returns trigger as
$$
begin
    NEW.parent_ids := node_trace(NEW.id);
    NEW.path := array_to_string(NEW.parent_ids, '/');

    return NEW;
end
$$ language plpgsql
    stable
    set search_path = "$user", public;

drop trigger if exists update_trace_trigger on node;
create trigger update_trace_trigger
    before insert
    on node
    for each row
execute function update_node_path();

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
