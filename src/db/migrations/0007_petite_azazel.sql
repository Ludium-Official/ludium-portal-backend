CREATE TYPE "public"."program_visibility_v2" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
CREATE TYPE "public"."login_type" AS ENUM('google', 'wallet', 'farcaster');--> statement-breakpoint
CREATE TABLE "users_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" "user_roles" DEFAULT 'user' NOT NULL,
	"login_type" "login_type" NOT NULL,
	"email" varchar(256),
	"wallet_address" varchar(256) NOT NULL,
	"first_name" varchar(256),
	"last_name" varchar(256),
	"organization_name" varchar(256),
	"profile_image" text,
	"bio" text,
	"skills" varchar(256)[],
	"links" varchar(256)[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_wallet_unique" UNIQUE("email","wallet_address")
);
--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "skills" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "deadline" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "visibility" SET DATA TYPE "public"."program_visibility_v2" USING "visibility"::"public"."program_visibility_v2";--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "visibility" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "network" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "programs_v2" ALTER COLUMN "currency" SET NOT NULL;