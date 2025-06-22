-- Rename expires column to expiresAt with the same data type
ALTER TABLE "Session" RENAME COLUMN "expires" TO "expiresAt";
