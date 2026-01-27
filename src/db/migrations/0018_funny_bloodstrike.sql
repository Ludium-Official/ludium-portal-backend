CREATE TYPE "public"."notification_v2_action" AS ENUM('created', 'accepted', 'rejected', 'submitted', 'completed', 'broadcast', 'invited', 'updated', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."notification_v2_type" AS ENUM('program', 'application', 'milestone', 'contract', 'article', 'thread', 'system');--> statement-breakpoint
CREATE TABLE "notifications_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_v2_type" NOT NULL,
	"action" "notification_v2_action" NOT NULL,
	"recipient_id" integer NOT NULL,
	"entity_id" varchar(256) NOT NULL,
	"title" varchar(255),
	"content" text,
	"metadata" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications_v2" ADD CONSTRAINT "notifications_v2_recipient_id_users_v2_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;