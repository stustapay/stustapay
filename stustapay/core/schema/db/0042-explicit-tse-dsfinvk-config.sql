-- migration: 8ac08b65
-- requires: a8f3e291

create type tax_type as enum ('regular_vat', 'reduced_vat', 'no_tax', 'transparent');

alter table tax_rate add column tax_type tax_type;

update tax_rate
set tax_type = case name
    when 'ust' then 'regular_vat'::tax_type
    when 'eust' then 'reduced_vat'::tax_type
    when 'none' then 'no_tax'::tax_type
    when 'transparent' then 'transparent'::tax_type
    else 'no_tax'::tax_type
end;

alter table tax_rate alter column tax_type set not null;

alter table event add column bon_street text;
alter table event add column bon_zip text;
alter table event add column bon_city text;
alter table event add column bon_country text not null default 'DEU';

update event
set
    bon_street = split_part(bon_address, E'\n', 1),
    bon_zip = split_part(trim(split_part(bon_address, E'\n', 2)), ' ', 1),
    bon_city = nullif(
        trim(substring(trim(split_part(bon_address, E'\n', 2)) from position(' ' in trim(split_part(bon_address, E'\n', 2))) + 1)),
        ''
    )
where bon_address like '%' || E'\n' || '%';

update event
set
    bon_street = split_part(bon_address, ' ', 1) || ' ' || split_part(bon_address, ' ', 2),
    bon_zip = split_part(bon_address, ' ', 3),
    bon_city = split_part(bon_address, ' ', 4)
where bon_address not like '%' || E'\n' || '%'
  and bon_street is null;

update event
set
    bon_street = coalesce(bon_street, bon_address),
    bon_zip = coalesce(bon_zip, ''),
    bon_city = coalesce(bon_city, '')
where bon_street is null or bon_zip is null or bon_city is null;

alter table event alter column bon_street set not null;
alter table event alter column bon_zip set not null;
alter table event alter column bon_city set not null;

alter table event drop column bon_address;

alter table till_tse_history add column till_id_new bigint;
update till_tse_history set till_id_new = till_id::bigint;
alter table till_tse_history drop column till_id;
alter table till_tse_history rename column till_id_new to till_id;
alter table till_tse_history alter column till_id set not null;

alter table till_tse_history
    add constraint till_tse_history_till_id_fkey foreign key (till_id) references till (id);
