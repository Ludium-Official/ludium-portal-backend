CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'completed', 'failed', 'revision_requested');--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "status" "milestone_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" DROP COLUMN "completed";