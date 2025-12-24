-- 1. Add nickname column
ALTER TABLE "users_v2" ADD COLUMN "nickname" varchar(256);

-- 2. Migrate existing data to nickname (first_name + ' ' + last_name)
UPDATE "users_v2" 
SET "nickname" = TRIM(CONCAT_WS(' ', "first_name", "last_name"))
WHERE "first_name" IS NOT NULL OR "last_name" IS NOT NULL;

-- 3. Add location column
ALTER TABLE "users_v2" ADD COLUMN "location" text;

-- 4. Safely drop old columns
ALTER TABLE "users_v2" DROP COLUMN "first_name";
ALTER TABLE "users_v2" DROP COLUMN "last_name";

-- Changes related to milestones_v2
ALTER TABLE "milestones_v2" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "milestones_v2" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "milestones_v2" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "milestones_v2" ALTER COLUMN "deadline" DROP NOT NULL;
ALTER TABLE "milestones_v2" ALTER COLUMN "status" DROP NOT NULL;