DO $$ BEGIN
 CREATE TYPE "public"."roles" AS ENUM('admin', 'user');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(256),
	"last_name" varchar(256),
	"email" varchar(256) NOT NULL,
	"role" "roles" DEFAULT 'user',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
