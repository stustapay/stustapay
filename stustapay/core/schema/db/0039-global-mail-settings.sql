-- migration: 0000039
-- requires: 0000038

-- Global fallback mail settings for nodes that are not part of an event.
insert into config (
    key, value
)
values
    ('mail.enabled', 'false'),
    ('mail.default_sender', null),
    ('mail.smtp_host', null),
    ('mail.smtp_port', null),
    ('mail.smtp_username', null),
    ('mail.smtp_password', null)
on conflict do nothing;
