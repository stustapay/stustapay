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

insert into config (key, value, node_id)
values
    ('mail.invitation.subject', 'Invitation to manage {{ node_name }}', 0),
    ('mail.invitation.text_body', E'Hello {{ display_name }},\n\nYou have been invited to manage {{ node_name }} in the StuStaPay administration portal.\n\nTo activate your account, please click the following link and set your password:\n{{ invitation_url }}\n\nThis invitation will expire on {{ expires_at }}.\n\nIf you did not expect this invitation, please ignore this email.\n\nBest regards,\nThe StuStaPay Team\n', 0),
    ('mail.invitation.html_body', '<p>Hello {{ display_name }},</p><p>You have been invited to manage <strong>{{ node_name }}</strong> in the StuStaPay administration portal.</p><p>To activate your account, please click the following link and set your password:</p><p><a href="{{ invitation_url }}">{{ invitation_url }}</a></p><p>This invitation will expire on {{ expires_at }}.</p><p>If you did not expect this invitation, please ignore this email.</p><p>Best regards,<br />The StuStaPay Team</p>', 0)
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
