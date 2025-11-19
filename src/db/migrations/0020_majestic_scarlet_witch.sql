CREATE TYPE "public"."user_roles_v2" AS ENUM('user', 'admin', 'relayer');--> statement-breakpoint
ALTER TABLE "users_v2" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users_v2" ALTER COLUMN "role" SET DATA TYPE "public"."user_roles_v2" USING "role"::text::"public"."user_roles_v2";--> statement-breakpoint
ALTER TABLE "users_v2" ALTER COLUMN "role" SET DEFAULT 'user';