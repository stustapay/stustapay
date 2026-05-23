-- migration: fd69246a
-- requires: 6dc876fd

alter table event add column customer_portal_feedback_url text;
