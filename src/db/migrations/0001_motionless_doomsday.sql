ALTER TYPE "public"."program_status" ADD VALUE 'payment_required' BEFORE 'published';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "educhain_application_id" varchar(256);--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "educhain_id" varchar(256);