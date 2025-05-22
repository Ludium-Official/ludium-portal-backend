CREATE TYPE "public"."notification_action" AS ENUM('created', 'accepted', 'rejected', 'submitted', 'completed', 'broadcast');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('program', 'application', 'milestone', 'comment', 'system');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"action" "notification_action" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" varchar(255),
	"content" text,
	"metadata" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."application_status";--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('pending', 'accepted', 'rejected', 'completed', 'submitted');--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."application_status";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::"public"."application_status";--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."milestone_status";--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'completed', 'rejected', 'submitted');--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."milestone_status";--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DATA TYPE "public"."milestone_status" USING "status"::"public"."milestone_status";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;