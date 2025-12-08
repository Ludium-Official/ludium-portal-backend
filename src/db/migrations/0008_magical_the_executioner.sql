ALTER TYPE "public"."program_status_v2" ADD VALUE 'deleted';--> statement-breakpoint
ALTER TABLE "programs_v2" ADD COLUMN "deleted_at" timestamp;