-- Create enum if not exists
DO $$ BEGIN
 CREATE TYPE "public"."user_roles_v2" AS ENUM('user', 'admin', 'relayer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Drop old constraint if exists
DO $$ BEGIN
 ALTER TABLE "users_v2" DROP CONSTRAINT "email_wallet_unique";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;--> statement-breakpoint

-- Alter role column type
ALTER TABLE "users_v2" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_v2" ALTER COLUMN "role" SET DATA TYPE "public"."user_roles_v2" USING "role"::text::"public"."user_roles_v2";
EXCEPTION
 WHEN OTHERS THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "users_v2" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint

-- Add new constraint if not exists
DO $$ BEGIN
 ALTER TABLE "users_v2" ADD CONSTRAINT "unique_wallet_address" UNIQUE("wallet_address");
EXCEPTION
 WHEN duplicate_table THEN null;
END $$;