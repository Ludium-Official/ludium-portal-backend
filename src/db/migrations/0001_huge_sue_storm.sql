CREATE TYPE "public"."funding_condition" AS ENUM('open', 'tier');--> statement-breakpoint
CREATE TYPE "public"."investment_tier" AS ENUM('bronze', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."program_type" AS ENUM('regular', 'funding');--> statement-breakpoint
CREATE TYPE "public"."investment_status" AS ENUM('pending', 'confirmed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "user_tier_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "investment_tier" NOT NULL,
	"max_investment_amount" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"price" varchar(256) NOT NULL,
	"purchase_limit" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" varchar(256) NOT NULL,
	"tier" "investment_tier",
	"tx_hash" varchar(256),
	"status" "investment_status" DEFAULT 'pending' NOT NULL,
	"reclaim_tx_hash" varchar(256),
	"reclaimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"investment_id" uuid NOT NULL,
	"amount" varchar(256) NOT NULL,
	"percentage" varchar(10) NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"tx_hash" varchar(256),
	"error_message" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "funding_target" varchar(256);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "wallet_address" varchar(256);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "funding_successful" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "type" "program_type" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "application_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "application_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "funding_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "funding_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "funding_condition" "funding_condition" DEFAULT 'open';--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "max_funding_amount" varchar(256);--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "fee_percentage" integer DEFAULT 300;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "custom_fee_percentage" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "tier_settings" jsonb;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "contract_address" varchar(256);--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "terms" varchar(256) DEFAULT 'ETH';--> statement-breakpoint
ALTER TABLE "user_tier_assignments" ADD CONSTRAINT "user_tier_assignments_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tier_assignments" ADD CONSTRAINT "user_tier_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_terms" ADD CONSTRAINT "investment_terms_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payouts" ADD CONSTRAINT "milestone_payouts_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payouts" ADD CONSTRAINT "milestone_payouts_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;