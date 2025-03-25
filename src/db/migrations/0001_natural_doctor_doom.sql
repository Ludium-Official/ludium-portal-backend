ALTER TABLE "wallet" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet" ADD COLUMN "network" varchar(256) DEFAULT 'Ethereum';--> statement-breakpoint
ALTER TABLE "wallet" DROP COLUMN "balance";