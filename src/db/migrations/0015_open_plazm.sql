ALTER TABLE "articles" ALTER COLUMN "status" SET DATA TYPE text;
UPDATE "articles" SET "status" = 'draft' WHERE "status" = 'pending';
ALTER TABLE "articles" ALTER COLUMN "status" SET DEFAULT 'draft'::text;
DROP TYPE "public"."article_status";
CREATE TYPE "public"."article_status" AS ENUM('published', 'draft');
ALTER TABLE "articles" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."article_status";
ALTER TABLE "articles" ALTER COLUMN "status" SET DATA TYPE "public"."article_status" USING "status"::"public"."article_status";