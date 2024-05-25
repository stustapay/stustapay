-- revision: 2b0f2fb3
-- requires: d1dd53bd

alter table customer_info add column donate_all boolean default false not null;
alter table customer_info add column has_entered_info boolean default false not null;

-- for all account of type private, create customer_info record
with has_customer_info as (
    select
        a.id,
        (select exists (select from customer_info ci where a.id = ci.customer_account_id)) as has_customer_info
    from
        account a
    where
        a.type = 'private'
)
insert into customer_info ( customer_account_id ) (
    select id
    from has_customer_info
    where not has_customer_info
);
insert into account_type (name)
values
('donation_exit');

insert into account (
    node_id, type, name, comment
)
select
    id, 'donation_exit', 'donation exit', 'target account when donation exits the system'
from
    node
where
    event_id is not null
    and not exists (
        select 1
        from account
        where node_id = node.id and type = 'donation_exit'
);

alter table event add column email_enabled boolean default false not null;
alter table event add column email_default_sender text default 'tobias.juelg@stusta.de';
alter table event add column email_smtp_host text default 'mail.stusta.de';
alter table event add column email_smtp_port int default 465;
alter table event add column email_smtp_username text;
alter table event add column email_smtp_password text;
alter table event add column payout_done_subject text default '[StuStaPay] Payout Completed' not null;
alter table event add column payout_done_message text default 'Thank you for your patients. The payout process has been completed and the funds should arrive within the next days to your specifed bank account.' not null;
alter table event add column payout_registered_subject text default '[StuStaPay] Registered for Payout' not null;
alter table event add column payout_registered_message text default 'Thank you for being part of our festival. Your remaining funds are registered for payout. They will be transfered to the specified bank account in our next manual payout. You will receive another email once we transfered the funds.' not null;
alter table event add column payout_sender text;

