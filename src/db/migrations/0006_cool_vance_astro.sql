CREATE TYPE "public"."commentable_type" AS ENUM('post', 'program', 'milestone');--> statement-breakpoint
CREATE TYPE "public"."program_visibility" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
ALTER TYPE "public"."application_status" ADD VALUE 'draft' BEFORE 'pending';--> statement-breakpoint
ALTER TYPE "public"."notification_action" ADD VALUE 'invited';--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "programs" DROP CONSTRAINT "programs_validator_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "commentable_type" "commentable_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "commentable_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "visibility" "program_visibility" DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "deadline" date NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "post_id";--> statement-breakpoint
ALTER TABLE "programs" DROP COLUMN "validator_id";