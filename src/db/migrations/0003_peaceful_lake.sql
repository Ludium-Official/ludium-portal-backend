ALTER TABLE "programs" ADD COLUMN "reclaimed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "reclaim_tx_hash" varchar(256);--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "reclaimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "reclaimed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "reclaim_tx_hash" varchar(256);--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "reclaimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "investment_term_id" uuid;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_investment_term_id_investment_terms_id_fk" FOREIGN KEY ("investment_term_id") REFERENCES "public"."investment_terms"("id") ON DELETE set null ON UPDATE no action;