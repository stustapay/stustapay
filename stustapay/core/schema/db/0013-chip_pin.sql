-- revision: 43408ac4
-- requires: c66cbafc

-- change primary key of user_tag table to a generated bigint

-- 1. add the new column
alter table user_tag add column id bigint not null generated always as identity (start with 1000);

-- 2. drop all foreign key constraints
alter table usr drop constraint usr_user_tag_uid_fkey;
alter table account drop constraint account_user_tag_uid_fkey;
alter table account_tag_association_history drop constraint account_tag_association_history_user_tag_uid_fkey;

-- 3. make the new column a primary key
alter table user_tag drop constraint user_tag_pkey;
alter table user_tag alter column uid drop not null;
alter table user_tag add constraint user_tag_pkey primary key(id);

-- 4. clean up user_tag table
alter table user_tag drop column serial;
alter table user_tag alter column pin set not null;
alter table user_tag add constraint user_tag_pin_unique unique(pin);

-- 5. add back foreign keys
alter table usr add column user_tag_id bigint references user_tag(id);
update usr set user_tag_id = u.id from user_tag u join usr usr2 on u.uid = usr2.user_tag_uid where usr.user_tag_uid = usr2.user_tag_uid;
alter table usr drop user_tag_uid;

alter table account add column user_tag_id bigint references user_tag(id);
update account set user_tag_id = u.id from user_tag u join account a2 on u.uid = a2.user_tag_uid where account.user_tag_uid = a2.user_tag_uid;
alter table account drop user_tag_uid;

alter table account_tag_association_history add column user_tag_id bigint references user_tag(id);
update account_tag_association_history set user_tag_id = u.id
from user_tag u join account_tag_association_history atah on u.uid = atah.user_tag_uid
where atah.user_tag_uid = account_tag_association_history.user_tag_uid;
alter table account_tag_association_history drop user_tag_uid;

create index on user_tag (pin, uid, node_id);
