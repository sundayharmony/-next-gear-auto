-- Grant manager panel access and owner portal access to one account.
-- Owner finance only includes vehicles whose owner_id is this customer.
-- Run in the Supabase SQL Editor.

UPDATE customers
SET
  role = 'manager',
  manager_access_enabled = TRUE,
  manager_access_granted_at = COALESCE(manager_access_granted_at, NOW()),
  manager_access_revoked_at = NULL,
  owner_portal_enabled = TRUE
WHERE lower(email) = 'maccesar.inc@gmail.com';
