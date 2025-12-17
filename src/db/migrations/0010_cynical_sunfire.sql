ALTER TABLE "users_v2" RENAME COLUMN "bio" TO "about";--> statement-breakpoint
ALTER TABLE "users_v2" RENAME COLUMN "organization_name" TO "user_role";--> statement-breakpoint
ALTER TABLE "users_v2" DROP COLUMN "links";

CREATE TABLE IF NOT EXISTS "languages_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"language" varchar(100) NOT NULL,
	"proficiency" varchar(50) NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "languages_v2" ADD CONSTRAINT "languages_v2_user_id_users_v2_id_fk" FOREIGN KEY ("user_id") REFERENCES "users_v2"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "work_experiences_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company" varchar(256) NOT NULL,
	"role" varchar(256) NOT NULL,
	"employment_type" varchar(50) NOT NULL,
	"current_work" boolean DEFAULT false NOT NULL,
	"start_year" integer NOT NULL,
	"start_month" varchar(50),
	"end_year" integer,
	"end_month" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_experiences_v2" ADD CONSTRAINT "work_experiences_v2_user_id_users_v2_id_fk" FOREIGN KEY ("user_id") REFERENCES "users_v2"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "educations_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"school" varchar(256) NOT NULL,
	"degree" varchar(100),
	"study" varchar(256),
	"attended_start_date" integer,
	"attended_end_date" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "educations_v2" ADD CONSTRAINT "educations_v2_user_id_users_v2_id_fk" FOREIGN KEY ("user_id") REFERENCES "users_v2"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;