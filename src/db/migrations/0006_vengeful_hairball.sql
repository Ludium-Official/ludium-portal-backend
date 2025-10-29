CREATE TYPE "public"."onchain_program_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
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
ALTER TABLE "smart_contracts" ALTER COLUMN "address" SET DATA TYPE varchar(42);--> statement-breakpoint
ALTER TABLE "onchain_program_info" ADD CONSTRAINT "onchain_program_info_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_program_info" ADD CONSTRAINT "onchain_program_info_smart_contract_id_smart_contracts_id_fk" FOREIGN KEY ("smart_contract_id") REFERENCES "public"."smart_contracts"("id") ON DELETE cascade ON UPDATE no action;