ALTER TABLE "milestones_v2" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "milestones_v2" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
UPDATE "milestones_v2" SET "status" = 'in_progress' WHERE "status" = 'progress';--> statement-breakpoint
UPDATE "milestones_v2" SET "status" = 'completed' WHERE "status" = 'finished';--> statement-breakpoint
UPDATE "milestones_v2" SET "status" = 'completed' WHERE "status" = 'reviewed';--> statement-breakpoint
DROP TYPE "public"."milestone_status_v2";--> statement-breakpoint
CREATE TYPE "public"."milestone_status_v2" AS ENUM('draft', 'under_review', 'in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "milestones_v2" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."milestone_status_v2";--> statement-breakpoint
ALTER TABLE "milestones_v2" ALTER COLUMN "status" SET DATA TYPE "public"."milestone_status_v2" USING "status"::"public"."milestone_status_v2";