-- migration: 0000040
-- requires: 0000039

insert into privilege (name)
values ('global_email_management')
on conflict do nothing;

insert into user_role_to_privilege (role_id, privilege)
select 0, name
from privilege
where name = 'global_email_management'
on conflict do nothing;

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_name = 'mails' and column_name = 'message'
    ) then
        alter table mails rename column message to text_message;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_name = 'mails' and column_name = 'html_message'
          and data_type = 'boolean'
    ) then
        alter table mails rename column html_message to html_message_legacy;
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_name = 'mails' and column_name = 'html_message'
          and data_type = 'text'
    ) then
        alter table mails add column html_message text;
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_name = 'mails' and column_name = 'html_message_legacy'
    ) then
        update mails
        set html_message = case when html_message_legacy then text_message else null end;

        alter table mails drop column html_message_legacy;
    end if;
end $$;
