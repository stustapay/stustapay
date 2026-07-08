-- migration: a8f3e291
-- requires: f3c8a1b2

alter table user_tag_variant rename column event_node_id to node_id;

alter table user_tag_variant add column description text not null default '';
alter table user_tag_variant add column priority int not null default 0;

insert into user_tag_variant (node_id, variant_name, description, priority)
select distinct
    coalesce(n.event_node_id, n.id),
    ut.restriction,
    case ut.restriction
        when 'under_16' then 'User tag holder under 16 years'
        when 'under_18' then 'User tag holder under 18 years'
        else ''
    end,
    case ut.restriction
        when 'under_16' then 1
        when 'under_18' then 2
        else 0
    end
from user_tag ut
join node n on ut.node_id = n.id
where ut.restriction is not null
on conflict (node_id, variant_name) do nothing;

insert into user_tag_variant (node_id, variant_name, description, priority)
select distinct
    coalesce(n.event_node_id, n.id),
    pr.restriction,
    case pr.restriction
        when 'under_16' then 'User tag holder under 16 years'
        when 'under_18' then 'User tag holder under 18 years'
        else ''
    end,
    case pr.restriction
        when 'under_16' then 1
        when 'under_18' then 2
        else 0
    end
from product_restriction pr
join product p on pr.id = p.id
join node n on p.node_id = n.id
on conflict (node_id, variant_name) do nothing;

create table user_tag_to_variant (
    user_tag_id bigint not null references user_tag (id) on delete cascade,
    variant_id  bigint not null references user_tag_variant (id) on delete cascade,
    primary key (user_tag_id, variant_id)
);

insert into user_tag_to_variant (user_tag_id, variant_id)
select ut.id, utv.id
from user_tag ut
join node n on ut.node_id = n.id
join user_tag_variant utv
    on ut.restriction = utv.variant_name
    and utv.node_id = coalesce(n.event_node_id, n.id)
where ut.restriction is not null
on conflict do nothing;

insert into user_tag_to_variant (user_tag_id, variant_id)
select ut.id, ut.variant_id
from user_tag ut
where ut.variant_id is not null
on conflict do nothing;

alter table user_tag drop constraint user_tag_restriction_fkey;
alter table user_tag drop column restriction;
alter table user_tag drop column variant_id;

alter table product_restriction add column user_tag_variant_id bigint references user_tag_variant (id);

update product_restriction target
set user_tag_variant_id = mapping.variant_id
from (
    select
        pr.id as product_id,
        pr.restriction,
        utv.id as variant_id
    from product_restriction pr
    join product p on pr.id = p.id
    join node n on p.node_id = n.id
    join user_tag_variant utv
        on pr.restriction = utv.variant_name
        and utv.node_id = coalesce(n.event_node_id, n.id)
) mapping
where target.id = mapping.product_id
  and target.restriction = mapping.restriction;

alter table product_restriction drop constraint product_restriction_restriction_fkey;
alter table product_restriction drop constraint product_restriction_id_restriction_key;
alter table product_restriction drop column restriction;
alter table product_restriction alter column user_tag_variant_id set not null;
alter table product_restriction add unique (id, user_tag_variant_id);

alter table product_restriction rename to product_user_tag_variant;

drop table restriction_type;
