-- migration: 0000039
-- requires: 0000038

-- Global fallback mail settings for nodes that are not part of an event.
insert into config (
    key, value, node_id
)
values
    ('mail.enabled', 'false', 0),
    ('mail.default_sender', null, 0),
    ('mail.smtp_host', null, 0),
    ('mail.smtp_port', null, 0),
    ('mail.smtp_username', null, 0),
    ('mail.smtp_password', null, 0)
on conflict do nothing;
