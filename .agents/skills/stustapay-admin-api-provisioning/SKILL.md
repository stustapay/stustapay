---
name: stustapay-admin-api-provisioning
description: Use when StuStaPay live objects should be created or adjusted through the existing administration API instead of direct database access. Covers terminal, till, user-login, cashier lookup, and safe verification workflows for TeamFestlichPay-style operational changes.
---

# StuStaPay Admin API Provisioning

Use this skill when the user wants live operational changes through the existing administration API, especially for nodes, terminals, tills, terminal user logins, and user renames.

## Start

- Prefer the existing administration API over direct database writes when the user explicitly asks for API-based changes.
- Assume production-like changes are live changes. Read first, mutate second, verify last.
- Treat auth tokens as secrets. Do not echo them back in normal responses.
- Base URL for the hosted administration frontend is usually:
  - `https://<host>/api`
- Do not assume `/api/admin`; the web app uses `/api`.

## Safe order of operations

1. Inspect the current live state for the target `node_id`.
2. Derive the existing naming and profile pattern from live data.
3. Create or update only the missing objects.
4. Verify the final state with fresh read calls.
5. Report created ids, assigned users, and anything still incomplete.

## Common read endpoints

- Terminals:
  - `GET /terminal?node_id=<id>`
- Tills:
  - `GET /tills?node_id=<id>`
- Cashiers and terminal-user availability:
  - `GET /cashiers?node_id=<id>`
- Users:
  - `GET /users?node_id=<id>`
  - `GET /users/<user_id>?node_id=<id>`
- Roles:
  - `GET /user-roles?node_id=<id>`

## Common write endpoints

- Create terminal:
  - `POST /terminal?node_id=<id>`
  - body: `{"name","description","mode":"till","entry_area_id":null,"self_service":false}`
- Create till:
  - `POST /tills?node_id=<id>`
  - body: `{"name","description","active_shift":null,"active_profile_id":<profile_id>,"terminal_id":<terminal_id>}`
- Log a user into a terminal:
  - `POST /terminal/<terminal_id>/login-user?node_id=<id>`
  - body: `{"user_id":<user_id>,"role_id":<role_id>}`
- Update a user:
  - `POST /users/<user_id>?node_id=<id>`
  - preserve existing fields you are not intentionally changing

## Provisioning patterns

### Add another terminal+till pair for an existing group

- Read terminals and tills for the node.
- Find the existing group by name, for example `Bierstand`, `Bierwagen`, or `Kuttenmanufaktur`.
- Reuse the existing till profile from the matching till.
- Continue numbering from the live set instead of assuming static numbers.
- Create terminal first, then till attached to the new terminal.

### Log in users for newly created terminals

- Read `GET /cashiers?node_id=<id>`.
- Reuse the live role pattern from existing terminals; in the TeamFestlichPay case this was `role_id=1056` for standard sale terminals.
- Prefer free users whose `terminal_ids` list is empty.
- Do not overwrite terminals that already have `active_user_id`.
- Verify any terminal still left without a user after the batch.

### Rename users safely

- Removing markers like `(Copy)` usually means updating `login`.
- Before updating, confirm the target plain login does not already exist.
- Read the full user record first, then send an update payload that preserves:
  - `display_name`
  - `description`
  - `user_tag_pin`
  - `user_tag_uid_hex`
  - `email`

## Operational rules

- Prefer `curl` for simple reads and writes.
- For repeated live mutations, a short Python helper is acceptable when it reduces operator error.
- Never guess a `profile_id`; derive it from a sibling till in live data.
- Never guess a `role_id`; derive it from existing terminal assignments or the live role list.
- If a terminal name in live data has inconsistent whitespace or formatting, verify by id and by stripped name before creating a “new” one.
- If the user asks for “everything”, clarify whether that means:
  - one new instance per existing numbered instance, or
  - one additional terminal for each group

## Verification checklist

- New terminal exists with expected `till_id`.
- New till exists with expected `active_profile_id` and `terminal_id`.
- New terminal has the expected `active_user_id` if login was requested.
- No duplicate names were created accidentally.
- Report any pre-existing incomplete objects, such as a terminal without till or without user.
