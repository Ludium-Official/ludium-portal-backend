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
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_chain_info_id_networks_id_fk" FOREIGN KEY ("chain_info_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;