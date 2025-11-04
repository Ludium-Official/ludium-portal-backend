ALTER TABLE "onchain_contract_info" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
DROP TYPE "public"."onchain_contract_status";--> statement-breakpoint
CREATE TYPE "public"."onchain_contract_status" AS ENUM('active', 'paused', 'completed', 'updated', 'cancelled');--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."onchain_contract_status";--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ALTER COLUMN "status" SET DATA TYPE "public"."onchain_contract_status" USING "status"::"public"."onchain_contract_status";--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD COLUMN "sponsor_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD COLUMN "smart_contract_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD COLUMN "onchain_contract_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD CONSTRAINT "onchain_contract_info_sponsor_id_users_v2_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" ADD CONSTRAINT "onchain_contract_info_smart_contract_id_smart_contracts_id_fk" FOREIGN KEY ("smart_contract_id") REFERENCES "public"."smart_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onchain_contract_info" DROP COLUMN "content_hash";