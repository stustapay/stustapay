-- migration: 706ba453
-- requires: 3e242fc3

create or replace procedure __migration_check_user_cash_registers() as
$$
<<locals>> declare
    num_users_with_cash_registers  bigint;
begin
    select count(*) into locals.num_users_with_cash_registers
    from usr where cash_register_id is not null;

    if locals.num_users_with_cash_registers > 0 then
        raise 'This migration requires that no user has an assigned cash register';
    end if;
end;
$$ language plpgsql
    set search_path = "$user", public;

call __migration_check_user_cash_registers();
drop procedure __migration_check_user_cash_registers();

insert into account_type (name) values ('cash_register');

alter table cash_register add column account_id bigint references account(id);

create procedure __migration_generate_cash_register_accounts() as
$$
<<locals>> declare
    cr record;
    event_node_id bigint;
    account_id bigint;
begin
    for cr in select id, name, node_id from cash_register loop
        select n.event_node_id into locals.event_node_id from node n where n.id = cr.node_id;

        insert into account (type, name, node_id)
        values ('cash_register', 'Cash Register', locals.event_node_id)
        returning id into locals.account_id;

        update cash_register set account_id = locals.account_id where id = cr.id;
    end loop;
end;
$$ language plpgsql
    set search_path = "$user", public;

call __migration_generate_cash_register_accounts();
drop procedure __migration_generate_cash_register_accounts();

alter table cash_register alter column account_id set not null;

alter table user_to_role add column terminal_only bool not null default false;

alter table terminal add column active_user_id bigint references usr(id);
alter table terminal add column active_user_role_id bigint references user_role(id);

alter table till drop column active_user_id;
alter table till drop column active_user_role_id;
