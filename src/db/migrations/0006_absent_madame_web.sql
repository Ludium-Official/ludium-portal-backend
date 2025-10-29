CREATE TYPE "public"."application_status_v2" AS ENUM('applied', 'hired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."milestone_status_v2" AS ENUM('draft', 'progress', 'finished', 'reviewed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."program_status_v2" AS ENUM('under_review', 'open', 'closed', 'draft');--> statement-breakpoint
CREATE TYPE "public"."program_visibility_v2" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
CREATE TYPE "public"."login_type" AS ENUM('google', 'wallet', 'farcaster');--> statement-breakpoint
CREATE TYPE "public"."onchain_contract_status" AS ENUM('active', 'canceled', 'updated', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."onchain_program_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "applications_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"status" "application_status_v2" DEFAULT 'applied' NOT NULL,
	"content" text DEFAULT '',
	"rejected_reason" text DEFAULT '',
	"picked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"sponsor_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"price" varchar(238) NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"files" text[],
	"status" "milestone_status_v2" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"skills" text[] NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"invited_members" text[],
	"status" "program_status_v2" DEFAULT 'draft' NOT NULL,
	"visibility" "program_visibility_v2" NOT NULL,
	"network_id" integer NOT NULL,
	"price" varchar(64) NOT NULL,
	"token_id" integer NOT NULL,
	"sponsor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" "user_roles" DEFAULT 'user' NOT NULL,
	"login_type" "login_type" NOT NULL,
	"email" varchar(256),
	"wallet_address" varchar(256) NOT NULL,
	"first_name" varchar(256),
	"last_name" varchar(256),
	"organization_name" varchar(256),
	"profile_image" text,
	"bio" text,
	"skills" varchar(256)[],
	"links" varchar(256)[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_wallet_unique" UNIQUE("email","wallet_address")
);
--> statement-breakpoint
CREATE TABLE "networks" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"chain_name" varchar(100) NOT NULL,
	"mainnet" boolean DEFAULT false NOT NULL,
	"explore_url" varchar(256),
	CONSTRAINT "networks_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_info_id" integer NOT NULL,
	"token_name" varchar(10) NOT NULL,
	"token_address" varchar(42) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onchain_contract_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"content_hash" varchar(66) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" "onchain_contract_status" DEFAULT 'active' NOT NULL,
	"tx" varchar(66) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onchain_program_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"smart_contract_id" integer NOT NULL,
	"onchain_program_id" integer NOT NULL,
	"status" "onchain_program_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"tx" varchar(66) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_info_id" integer NOT NULL,
	"address" varchar(42) NOT NULL,
	"name" varchar(256) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications_v2" ADD CONSTRAINT "applications_v2_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications_v2" ADD CONSTRAINT "applications_v2_applicant_id_users_v2_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_v2" ADD CONSTRAINT "milestones_v2_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_v2" ADD CONSTRAINT "milestones_v2_sponsor_id_users_v2_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_v2" ADD CONSTRAINT "programs_v2_network_id_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_v2" ADD CONSTRAINT "programs_v2_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_v2" ADD CONSTRAINT "programs_v2_sponsor_id_users_v2_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_chain_info_id_networks_id_fk" FOREIGN KEY ("chain_info_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD CONSTRAINT "onchain_contract_info_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD CONSTRAINT "onchain_contract_info_applicant_id_users_v2_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_program_info" ADD CONSTRAINT "onchain_program_info_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_program_info" ADD CONSTRAINT "onchain_program_info_smart_contract_id_smart_contracts_id_fk" FOREIGN KEY ("smart_contract_id") REFERENCES "public"."smart_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_contracts" ADD CONSTRAINT "smart_contracts_chain_info_id_networks_id_fk" FOREIGN KEY ("chain_info_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;