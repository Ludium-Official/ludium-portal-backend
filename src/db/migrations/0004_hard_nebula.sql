CREATE TYPE "public"."carousel_item_type" AS ENUM('program', 'post');--> statement-breakpoint
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
ALTER TABLE "milestones" ADD COLUMN "file" varchar(512);--> statement-breakpoint
ALTER TABLE "carousel_items" ADD CONSTRAINT "carousel_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "is_banner";