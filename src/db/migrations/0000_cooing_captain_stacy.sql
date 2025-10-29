CREATE TYPE "public"."application_status" AS ENUM('pending', 'accepted', 'rejected', 'completed', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."carousel_item_type" AS ENUM('program', 'post');--> statement-breakpoint
CREATE TYPE "public"."commentable_type" AS ENUM('post', 'program', 'milestone', 'application');--> statement-breakpoint
CREATE TYPE "public"."fee_status" AS ENUM('pending', 'claimed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."keyword_type" AS ENUM('role', 'skill');--> statement-breakpoint
CREATE TYPE "public"."user_roles" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."funding_condition" AS ENUM('open', 'tier');--> statement-breakpoint
CREATE TYPE "public"."investment_tier" AS ENUM('bronze', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."program_role_type" AS ENUM('sponsor', 'validator', 'builder');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('pending', 'payment_required', 'rejected', 'published', 'closed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."program_type" AS ENUM('regular', 'funding');--> statement-breakpoint
CREATE TYPE "public"."program_visibility" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('draft', 'pending', 'completed', 'rejected', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."post_visibility" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
CREATE TYPE "public"."notification_action" AS ENUM('created', 'accepted', 'rejected', 'submitted', 'completed', 'broadcast', 'invited');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('program', 'application', 'milestone', 'comment', 'system');--> statement-breakpoint
CREATE TYPE "public"."investment_status" AS ENUM('pending', 'confirmed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."application_status_v2" AS ENUM('applied', 'accepted', 'rejected', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."program_status_v2" AS ENUM('under_review', 'open', 'closed', 'draft');--> statement-breakpoint
CREATE TYPE "public"."program_visibility_v2" AS ENUM('private', 'restricted', 'public');--> statement-breakpoint
CREATE TYPE "public"."login_type" AS ENUM('google', 'wallet', 'farcaster');--> statement-breakpoint
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
	"funding_target" varchar(256),
	"wallet_address" varchar(256),
	"funding_successful" boolean DEFAULT false,
	"on_chain_project_id" integer,
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
CREATE TABLE "fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"claimed_by" uuid NOT NULL,
	"amount" varchar(256) NOT NULL,
	"tx_hash" varchar(256),
	"status" "fee_status" DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp,
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
	"banned" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp,
	"banned_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "users_to_keywords" (
	"user_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"type" "keyword_type" DEFAULT 'role' NOT NULL,
	CONSTRAINT "users_to_keywords_user_id_keyword_id_type_pk" PRIMARY KEY("user_id","keyword_id","type")
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
	"deadline" timestamp NOT NULL,
	"creator_id" uuid NOT NULL,
	"status" "program_status" DEFAULT 'pending',
	"visibility" "program_visibility" DEFAULT 'public',
	"educhain_id" integer,
	"tx_hash" varchar(256),
	"network" varchar(256) DEFAULT 'educhain',
	"rejection_reason" text,
	"image" varchar(512),
	"type" "program_type" DEFAULT 'regular' NOT NULL,
	"application_start_date" timestamp,
	"application_end_date" timestamp,
	"funding_start_date" timestamp,
	"funding_end_date" timestamp,
	"funding_condition" "funding_condition" DEFAULT 'open',
	"max_funding_amount" varchar(256),
	"fee_percentage" integer DEFAULT 300,
	"custom_fee_percentage" integer,
	"reclaimed" boolean DEFAULT false,
	"reclaim_tx_hash" varchar(256),
	"reclaimed_at" timestamp,
	"tier_settings" jsonb,
	"contract_address" varchar(256),
	"terms" varchar(256) DEFAULT 'ETH',
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
CREATE TABLE "user_tier_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "investment_tier" NOT NULL,
	"max_investment_amount" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"price" varchar(256) NOT NULL,
	"purchase_limit" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"summary" varchar(512),
	"price" varchar(256) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'ETH',
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"links" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"rejection_reason" text,
	"file" varchar(512),
	"deadline" timestamp NOT NULL,
	"reclaimed" boolean DEFAULT false,
	"reclaim_tx_hash" varchar(256),
	"reclaimed_at" timestamp,
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
	"visibility" "post_visibility" DEFAULT 'public',
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
CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" varchar(256) NOT NULL,
	"tier" "investment_tier",
	"investment_term_id" uuid,
	"tx_hash" varchar(256),
	"status" "investment_status" DEFAULT 'pending' NOT NULL,
	"reclaim_tx_hash" varchar(256),
	"reclaimed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"investment_id" uuid NOT NULL,
	"amount" varchar(256) NOT NULL,
	"percentage" varchar(10) NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"tx_hash" varchar(256),
	"error_message" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"status" "application_status_v2" DEFAULT 'applied' NOT NULL,
	"content" text DEFAULT '',
	"rejected_reason" text DEFAULT '',
	"picked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"sponsor_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"price" varchar(238) NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"files" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"skills" text[] NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"invited_members" text[],
	"status" "program_status_v2" DEFAULT 'draft' NOT NULL,
	"visibility" "program_visibility_v2" NOT NULL,
	"network_id" integer NOT NULL,
	"price" varchar(64) NOT NULL,
	"token_id" integer NOT NULL,
	"sponsor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "networks" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"chain_name" varchar(100) NOT NULL,
	"mainnet" boolean DEFAULT false NOT NULL,
	"explore_url" varchar(256),
	CONSTRAINT "networks_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_info_id" integer NOT NULL,
	"token_name" varchar(10) NOT NULL,
	"token_address" varchar(42) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications_to_links" ADD CONSTRAINT "applications_to_links_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications_to_links" ADD CONSTRAINT "applications_to_links_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carousel_items" ADD CONSTRAINT "carousel_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "user_tier_assignments" ADD CONSTRAINT "user_tier_assignments_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tier_assignments" ADD CONSTRAINT "user_tier_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_terms" ADD CONSTRAINT "investment_terms_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_to_links" ADD CONSTRAINT "milestones_to_links_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_to_links" ADD CONSTRAINT "milestones_to_links_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts_to_keywords" ADD CONSTRAINT "posts_to_keywords_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts_to_keywords" ADD CONSTRAINT "posts_to_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_investment_term_id_investment_terms_id_fk" FOREIGN KEY ("investment_term_id") REFERENCES "public"."investment_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payouts" ADD CONSTRAINT "milestone_payouts_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payouts" ADD CONSTRAINT "milestone_payouts_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications_v2" ADD CONSTRAINT "applications_v2_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications_v2" ADD CONSTRAINT "applications_v2_applicant_id_users_v2_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_v2" ADD CONSTRAINT "milestones_v2_program_id_programs_v2_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones_v2" ADD CONSTRAINT "milestones_v2_sponsor_id_users_v2_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_v2" ADD CONSTRAINT "programs_v2_network_id_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_v2" ADD CONSTRAINT "programs_v2_token_id_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs_v2" ADD CONSTRAINT "programs_v2_sponsor_id_users_v2_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."users_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_chain_info_id_networks_id_fk" FOREIGN KEY ("chain_info_id") REFERENCES "public"."networks"("id") ON DELETE cascade ON UPDATE no action;