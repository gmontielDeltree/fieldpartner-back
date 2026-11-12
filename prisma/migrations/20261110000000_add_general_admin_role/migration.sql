-- Adds the platform-level GENERAL_ADMIN role (backoffice staff who can see
-- every account's users), distinct from the account-owner ADMIN role.
ALTER TYPE "UserRole" ADD VALUE 'GENERAL_ADMIN';
