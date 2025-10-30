ALTER TABLE "programs_v2" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
DROP TYPE "public"."program_status_v2";--> statement-breakpoint
CREATE TYPE "public"."program_status_v2" AS ENUM('draft', 'under_review', 'open', 'declined', 'closed');--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."program_status_v2";--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "status" SET DATA TYPE "public"."program_status_v2" USING "status"::"public"."program_status_v2";