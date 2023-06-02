-- revision: e2c0985c
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
$$ language plpgsql;

drop trigger if exists update_user_tag_association_to_account_trigger on usr;
create trigger update_user_tag_association_to_account_trigger
    before update on usr
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid)
execute function update_user_tag_association_to_account();

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
$$ language plpgsql;

drop trigger if exists update_account_user_tag_association_to_user_trigger on usr;
create trigger update_account_user_tag_association_to_user_trigger
    before update on usr
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid)
execute function update_account_user_tag_association_to_user();

alter table usr alter column customer_account_id set not null;
