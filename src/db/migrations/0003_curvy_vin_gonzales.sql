CREATE TYPE "public"."user_roles" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
ALTER TYPE "public"."milestone_status" ADD VALUE 'draft' BEFORE 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_roles" DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_admin";