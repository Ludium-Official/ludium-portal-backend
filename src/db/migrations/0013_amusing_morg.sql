ALTER TABLE "post_views" DROP CONSTRAINT "post_views_pkey";
--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_pkey" PRIMARY KEY("post_id","viewed_at");