ALTER TABLE "webhook" DROP CONSTRAINT "webhook_workspace_id_unique";--> statement-breakpoint
ALTER TABLE "webhook" ADD COLUMN "name" text DEFAULT 'Webhook' NOT NULL;