CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"sponsor_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"smart_contract_id" integer NOT NULL,
	"onchain_contract_id" integer NOT NULL,
	"contract_snapshot_cotents" jsonb,
	"contract_snapshot_hash" varchar(66),
	"builder_signature" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_sponsor_id_users_v2_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_applicant_id_users_v2_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_smart_contract_id_smart_contracts_id_fk" FOREIGN KEY ("smart_contract_id") REFERENCES "public"."smart_contracts"("id") ON DELETE cascade ON UPDATE no action;