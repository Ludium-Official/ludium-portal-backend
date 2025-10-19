CREATE TYPE "public"."program_status_v2" AS ENUM('under_review', 'open', 'closed', 'draft');--> statement-breakpoint
CREATE TABLE "programs_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"skills" text[],
	"deadline" timestamp with time zone,
	"invited_members" text[],
	"status" "program_status_v2" DEFAULT 'draft' NOT NULL,
	"visibility" varchar(32),
	"network" varchar(64),
	"price" varchar(64),
	"currency" varchar(16),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
