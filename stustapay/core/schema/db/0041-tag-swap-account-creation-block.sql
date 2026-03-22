-- migration: 0000041
-- requires: 0000040

alter table user_tag add column if not exists account_creation_blocked boolean not null default false;

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
        coalesce(ut.is_vip, false)                 as is_vip,
        coalesce(ut.account_creation_blocked, false) as account_creation_blocked
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

create or replace function ensure_private_account_tag_is_allowed() returns trigger as
$$
begin
    if NEW.type = 'private' and NEW.user_tag_id is not null and exists(
        select 1
        from user_tag ut
        where ut.id = NEW.user_tag_id
          and coalesce(ut.account_creation_blocked, false)
    ) then
        raise exception 'Tag is blocked from account creation';
    end if;

    return NEW;
end
$$ language plpgsql set search_path = "$user", public;

drop trigger if exists ensure_private_account_tag_is_allowed_trigger on account;
create trigger ensure_private_account_tag_is_allowed_trigger
    before insert or update of user_tag_id, type
    on account
    for each row
execute function ensure_private_account_tag_is_allowed();
