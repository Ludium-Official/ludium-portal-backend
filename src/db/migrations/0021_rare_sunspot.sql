ALTER TABLE "users_v2" DROP CONSTRAINT "email_wallet_unique";--> statement-breakpoint
ALTER TABLE "users_v2" ADD CONSTRAINT "unique_wallet_address" UNIQUE("wallet_address");