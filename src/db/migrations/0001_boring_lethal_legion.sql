ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DEFAULT 'applied'::text;--> statement-breakpoint
DROP TYPE "public"."application_status_v2";--> statement-breakpoint
CREATE TYPE "public"."application_status_v2" AS ENUM('applied', 'hired', 'rejected', 'finalized', 'progress', 'finished', 'reviewed', 'paid');--> statement-breakpoint
ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DEFAULT 'applied'::"public"."application_status_v2";--> statement-breakpoint
ALTER TABLE "applications_v2" ALTER COLUMN "status" SET DATA TYPE "public"."application_status_v2" USING "status"::"public"."application_status_v2";