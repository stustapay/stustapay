-- revision: 0ac8948f
-- requires: 90c7d52c

ALTER FUNCTION public.book_transaction(order_id bigint, description text, source_account_id bigint, target_account_id bigint, amount numeric, vouchers_amount bigint, booked_at timestamp with time zone, conducting_user_id bigint) SET search_path to "$user", public;
ALTER FUNCTION public.check_account_balance() SET search_path to "$user", public;
ALTER FUNCTION public.check_button_references_locked_products(product_id bigint) SET search_path to "$user", public;
ALTER FUNCTION public.check_button_references_max_one_non_fixed_price_product(button_id bigint, product_id bigint) SET search_path to "$user", public;
ALTER FUNCTION public.check_button_references_max_one_returnable_product(button_id bigint, product_id bigint) SET search_path to "$user", public;
ALTER FUNCTION public.check_button_references_max_one_voucher_product(button_id bigint, product_id bigint) SET search_path to "$user", public;
ALTER FUNCTION public.check_till_layout_contains_tickets_of_unique_restrictions(layout_id bigint, ticket_id bigint) SET search_path to "$user", public;
ALTER FUNCTION public.deny_in_trigger() SET search_path to "$user", public;
ALTER FUNCTION public.handle_till_user_login() SET search_path to "$user", public;
ALTER FUNCTION public.new_order_added() SET search_path to "$user", public;
ALTER FUNCTION public.product_stats(from_timestamp timestamp with time zone, to_timestamp timestamp with time zone) SET search_path to "$user", public;
ALTER FUNCTION public.tse_signature_finished_trigger_procedure() SET search_path to "$user", public;
ALTER FUNCTION public.tse_signature_update_trigger_procedure() SET search_path to "$user", public;
ALTER FUNCTION public.update_account_user_tag_association_to_user() SET search_path to "$user", public;
ALTER FUNCTION public.update_tag_association_history() SET search_path to "$user", public;
ALTER FUNCTION public.update_user_tag_association_to_account() SET search_path to "$user", public;
ALTER FUNCTION public.user_to_role_updated() SET search_path to "$user", public;
ALTER FUNCTION public.voucher_stats(from_timestamp timestamp with time zone, to_timestamp timestamp with time zone) SET search_path to "$user", public;
