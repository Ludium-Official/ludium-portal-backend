ALTER TABLE "milestones" ALTER COLUMN "price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "price" numeric(38, 18) DEFAULT '0' NOT NULL;