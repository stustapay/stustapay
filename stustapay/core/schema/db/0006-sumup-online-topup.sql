-- revision: 90c7d52c
-- requires: 3af7cc18

alter table customer_sumup_checkout drop column return_url;
alter table customer_sumup_checkout add column last_checked timestamptz;
alter table customer_sumup_checkout add column check_interval bigint not null default 1;
alter table ordr drop constraint till_required_for_non_online_orders;
alter table ordr alter column till_id set not null;
alter table ordr add constraint till_required_for_non_online_orders
    check ((payment_method = 'sumup_online' and cashier_id is null)
               or (payment_method != 'sumup_online' and cashier_id is not null));