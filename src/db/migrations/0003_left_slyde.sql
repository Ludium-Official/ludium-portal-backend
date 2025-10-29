CREATE TYPE "public"."onchain_contract_status_v2" AS ENUM('active', 'canceled', 'updated', 'paused', 'completed');--> statement-breakpoint
CREATE TABLE "onchain_contract_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"content_hash" varchar(66) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" "onchain_contract_status_v2" DEFAULT 'active' NOT NULL,
	"tx" varchar(66) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD CONSTRAINT "onchain_contract_info_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD CONSTRAINT "onchain_contract_info_applicant_id_users_v2_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;