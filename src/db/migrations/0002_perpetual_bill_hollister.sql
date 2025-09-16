CREATE TYPE "public"."fee_status" AS ENUM('pending', 'claimed', 'failed');--> statement-breakpoint
CREATE TABLE "fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"claimed_by" uuid NOT NULL,
	"amount" varchar(256) NOT NULL,
	"tx_hash" varchar(256),
	"status" "fee_status" DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "on_chain_project_id" integer;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;