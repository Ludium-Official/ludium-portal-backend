CREATE TABLE "portfolios_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"is_ludium_project" boolean DEFAULT false NOT NULL,
	"role" varchar(256),
	"description" varchar(1000),
	"images" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "portfolios_v2" ADD CONSTRAINT "portfolios_v2_user_id_users_v2_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;