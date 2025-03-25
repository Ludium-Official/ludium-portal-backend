ALTER TABLE "public"."milestones" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."milestone_status";--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'completed', 'failed', 'revision_requested');--> statement-breakpoint
ALTER TABLE "public"."milestones" ALTER COLUMN "status" SET DATA TYPE "public"."milestone_status" USING "status"::"public"."milestone_status";