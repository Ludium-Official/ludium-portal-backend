CREATE TYPE "public"."post_visibility" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "visibility" "post_visibility" DEFAULT 'public';