ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DEFAULT 'submitted'::text;--> statement-breakpoint
DROP TYPE "public"."application_status_v2";--> statement-breakpoint
CREATE TYPE "public"."application_status_v2" AS ENUM('submitted', 'pending_signature', 'in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DEFAULT 'submitted'::"public"."application_status_v2";--> statement-breakpoint
ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DATA TYPE "public"."application_status_v2" USING "status"::"public"."application_status_v2";