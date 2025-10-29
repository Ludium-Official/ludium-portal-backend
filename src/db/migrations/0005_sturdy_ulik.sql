CREATE TABLE "smart_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_info_id" integer NOT NULL,
	"address" varchar(66) NOT NULL,
	"name" varchar(256) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smart_contracts" ADD CONSTRAINT "smart_contracts_chain_info_id_networks_id_fk" FOREIGN KEY ("chain_info_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;