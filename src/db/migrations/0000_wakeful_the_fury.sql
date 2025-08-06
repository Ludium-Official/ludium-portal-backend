CREATE TYPE "public"."application_status" AS ENUM('draft', 'pending', 'accepted', 'rejected', 'completed', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."carousel_item_type" AS ENUM('program', 'post');--> statement-breakpoint
CREATE TYPE "public"."commentable_type" AS ENUM('post', 'program', 'milestone', 'application');--> statement-breakpoint
CREATE TYPE "public"."user_roles" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."program_role_type" AS ENUM('sponsor', 'validator', 'builder');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('draft', 'payment_required', 'published', 'closed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."program_visibility" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('draft', 'pending', 'completed', 'rejected', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."notification_action" AS ENUM('created', 'accepted', 'rejected', 'submitted', 'completed', 'broadcast', 'invited');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('program', 'application', 'milestone', 'comment', 'system');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"applicant_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"name" text NOT NULL,
	"content" text,
	"summary" varchar(512),
	"metadata" jsonb,
	"price" varchar(256) DEFAULT '0' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications_to_links" (
	"application_id" uuid NOT NULL,
	"link_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carousel_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" "carousel_item_type" NOT NULL,
	"item_id" uuid NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "carousel_items_display_order_is_active_unique" UNIQUE("display_order","is_active"),
	CONSTRAINT "carousel_items_item_type_item_id_is_active_unique" UNIQUE("item_type","item_id","is_active")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"commentable_type" "commentable_type" NOT NULL,
	"commentable_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(256) NOT NULL,
	"original_name" varchar(256) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"path" varchar(512) NOT NULL,
	"uploaded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(256),
	"last_name" varchar(256),
	"email" varchar(256),
	"wallet_address" varchar(256),
	"organization_name" varchar(256),
	"image" varchar(512),
	"about" text,
	"summary" varchar(512),
	"links" jsonb,
	"login_type" varchar(256),
	"role" "user_roles" DEFAULT 'user',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "users_to_keywords" (
	"user_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	CONSTRAINT "users_to_keywords_user_id_keyword_id_pk" PRIMARY KEY("user_id","keyword_id")
);
--> statement-breakpoint
CREATE TABLE "users_to_links" (
	"user_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	CONSTRAINT "users_to_links_user_id_link_id_pk" PRIMARY KEY("user_id","link_id")
);
--> statement-breakpoint
CREATE TABLE "program_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_type" "program_role_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"summary" text,
	"description" text,
	"price" varchar(256) NOT NULL,
	"currency" varchar(10) DEFAULT 'ETH' NOT NULL,
	"deadline" date NOT NULL,
	"creator_id" uuid NOT NULL,
	"status" "program_status" DEFAULT 'draft',
	"visibility" "program_visibility" DEFAULT 'public',
	"educhain_id" integer,
	"tx_hash" varchar(256),
	"network" varchar(256) DEFAULT 'educhain',
	"rejection_reason" text,
	"image" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs_to_keywords" (
	"program_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	CONSTRAINT "programs_to_keywords_program_id_keyword_id_pk" PRIMARY KEY("program_id","keyword_id")
);
--> statement-breakpoint
CREATE TABLE "programs_to_links" (
	"program_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	CONSTRAINT "programs_to_links_program_id_link_id_pk" PRIMARY KEY("program_id","link_id")
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "keywords_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"price" varchar(256) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'ETH',
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"links" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"rejection_reason" text,
	"file" varchar(512),
	"deadline" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones_to_links" (
	"milestone_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	CONSTRAINT "milestones_to_links_milestone_id_link_id_pk" PRIMARY KEY("milestone_id","link_id")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"summary" varchar(512) NOT NULL,
	"image" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts_to_keywords" (
	"post_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	CONSTRAINT "posts_to_keywords_post_id_keyword_id_pk" PRIMARY KEY("post_id","keyword_id")
);
--> statement-breakpoint
CREATE TABLE "post_views" (
	"post_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45),
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_views_pkey" PRIMARY KEY("post_id","user_id","ip_address")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"action" "notification_action" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" varchar(255),
	"content" text,
	"metadata" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications_to_links" ADD CONSTRAINT "applications_to_links_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications_to_links" ADD CONSTRAINT "applications_to_links_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carousel_items" ADD CONSTRAINT "carousel_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_keywords" ADD CONSTRAINT "users_to_keywords_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_keywords" ADD CONSTRAINT "users_to_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_links" ADD CONSTRAINT "users_to_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_links" ADD CONSTRAINT "users_to_links_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_user_roles" ADD CONSTRAINT "program_user_roles_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_user_roles" ADD CONSTRAINT "program_user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_to_keywords" ADD CONSTRAINT "programs_to_keywords_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_to_keywords" ADD CONSTRAINT "programs_to_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_to_links" ADD CONSTRAINT "programs_to_links_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_to_links" ADD CONSTRAINT "programs_to_links_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_to_links" ADD CONSTRAINT "milestones_to_links_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_to_links" ADD CONSTRAINT "milestones_to_links_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts_to_keywords" ADD CONSTRAINT "posts_to_keywords_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts_to_keywords" ADD CONSTRAINT "posts_to_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;