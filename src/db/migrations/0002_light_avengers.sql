CREATE TABLE "post_views" (
	"post_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45),
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_views_pkey" PRIMARY KEY("post_id","user_id","ip_address")
);
--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;