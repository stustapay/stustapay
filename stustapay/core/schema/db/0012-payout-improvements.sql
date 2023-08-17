-- revision: 8697011c
-- requires: 2a15b453

create or replace view customer as
    select
        a.*,
        customer_info.*
    from
        account_with_history a
        left join customer_info on (a.id = customer_info.customer_account_id)
    where
        a.type = 'private';

create or replace view payout_run_with_stats as
    (
    select
        p.*,
        s.total_donation_amount,
        s.total_payout_amount,
        s.n_payouts
    from
        payout_run p
        join (
            select
                py.id                                                      as id,
                coalesce(sum(c.donation), 0)                               as total_donation_amount,
                coalesce(sum(c.balance), 0) - coalesce(sum(c.donation), 0) as total_payout_amount,
                count(*)                                                   as n_payouts
            from
                payout_run py
                left join customer c on py.id = c.payout_run_id
            group by py.id
             ) s on p.id = s.id );