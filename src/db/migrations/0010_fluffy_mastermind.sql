CREATE TABLE "milestones_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"price" varchar(64) NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestones_v2" ADD CONSTRAINT "milestones_v2_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_v2" ADD CONSTRAINT "milestones_v2_applicant_id_users_v2_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;