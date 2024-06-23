-- migration: e2c0985c
-- requires: c7733331

alter table usr add column customer_account_id bigint references account(id) unique;

-- temporary function to create customer accounts / assign their current ones for all users
create or replace function temporary_create_accounts(user_id bigint, user_tag_uid numeric(20)) returns void as
$$
<<locals>> declare
    account_id bigint;
begin
    select id into locals.account_id
    from account a where a.user_tag_uid = temporary_create_accounts.user_tag_uid;

    if locals.account_id is null then
        insert into account (user_tag_uid, type) values (temporary_create_accounts.user_tag_uid, 'private') returning id into locals.account_id;
    end if;

    update usr set customer_account_id = locals.account_id where id = temporary_create_accounts.user_id;
end
$$ language plpgsql;

select temporary_create_accounts(usr.id, usr.user_tag_uid)
from usr where usr.customer_account_id is null;

drop function temporary_create_accounts;

alter table usr alter column customer_account_id set not null;
