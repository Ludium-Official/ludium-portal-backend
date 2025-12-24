ALTER TABLE "users_v2" RENAME COLUMN "bio" TO "about";--> statement-breakpoint
ALTER TABLE "users_v2" RENAME COLUMN "organization_name" TO "user_role";--> statement-breakpoint
ALTER TABLE "users_v2" DROP COLUMN "links";
--> statement-breakpoint