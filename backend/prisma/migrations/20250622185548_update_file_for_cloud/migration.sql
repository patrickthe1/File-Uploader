/*
  Warnings:

  - You are about to drop the column `localPath` on the `files` table. All the data in the column will be lost.
  - Added the required column `cloudUrl` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `files` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new columns with temporary default values
ALTER TABLE "files" ADD COLUMN "cloudUrl" TEXT NOT NULL DEFAULT 'migrating';
ALTER TABLE "files" ADD COLUMN "publicId" TEXT NOT NULL DEFAULT 'migrating';

-- Step 2: Update existing records with placeholder values (we'll migrate these manually later)
UPDATE "files" SET 
  "cloudUrl" = 'https://via.placeholder.com/300x200.png?text=File+Migration+Needed',
  "publicId" = 'migration_needed_' || "id"::text
WHERE "cloudUrl" = 'migrating';

-- Step 3: Remove default constraints (make them required without defaults)
ALTER TABLE "files" ALTER COLUMN "cloudUrl" DROP DEFAULT;
ALTER TABLE "files" ALTER COLUMN "publicId" DROP DEFAULT;

-- Step 4: Drop the old localPath column
ALTER TABLE "files" DROP COLUMN "localPath";
