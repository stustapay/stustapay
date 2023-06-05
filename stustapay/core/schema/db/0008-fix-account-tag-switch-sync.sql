-- revision: ce7d9f30
-- requires: 0ac8948f

drop trigger if exists update_user_tag_association_to_account_trigger on usr;
create trigger update_user_tag_association_to_account_trigger
    after update on usr
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid)
execute function update_user_tag_association_to_account();

-- there was an error where this trigger was initially set on the 'usr' table
drop trigger if exists update_account_user_tag_association_to_user_trigger on usr;
create trigger update_account_user_tag_association_to_user_trigger
    after update on account
    for each row
    when (OLD.user_tag_uid is distinct from NEW.user_tag_uid)
execute function update_account_user_tag_association_to_user();
