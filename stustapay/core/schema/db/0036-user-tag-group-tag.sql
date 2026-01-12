-- migration: 0000036
-- requires: 0000035

alter table user_tag add column if not exists group_tag text;

create index if not exists user_tag_group_tag_idx on user_tag (node_id, group_tag);

create or replace view user_tag_with_history as
    select
        ut.id,
        ut.node_id,
        ut.uid,
        ut.pin,
        ut.comment,
        ut.group_tag,
        a.id                                       as account_id,
        u.id                                       as user_id,
        coalesce(hist.account_history, '[]'::json) as account_history,
        coalesce(ut.is_vip, false)                 as is_vip
    from
        user_tag ut
        left join account a on a.user_tag_id = ut.id
        left join usr u on ut.id = u.user_tag_id
        left join (
            select
                atah.user_tag_id,
                json_agg(json_build_object('account_id', atah.account_id, 'mapping_was_valid_until',
                                           atah.mapping_was_valid_until, 'comment', ut.comment)) as account_history
            from
                account_tag_association_history atah
                join user_tag ut on atah.user_tag_id = ut.id
            group by atah.user_tag_id
        ) hist on ut.id = hist.user_tag_id;
