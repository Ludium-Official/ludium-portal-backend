CREATE TYPE "public"."keyword_type" AS ENUM('role', 'skill');--> statement-breakpoint
ALTER TABLE "users_to_keywords" DROP CONSTRAINT "users_to_keywords_user_id_keyword_id_pk";--> statement-breakpoint
ALTER TABLE "users_to_keywords" ADD COLUMN "type" "keyword_type" DEFAULT 'role' NOT NULL;--> statement-breakpoint
ALTER TABLE "users_to_keywords" ADD CONSTRAINT "users_to_keywords_user_id_keyword_id_type_pk" PRIMARY KEY("user_id","keyword_id","type");