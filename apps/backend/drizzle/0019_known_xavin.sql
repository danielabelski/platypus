CREATE TABLE "webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"url" text NOT NULL,
	"signing_secret" text NOT NULL,
	"headers" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"events" jsonb DEFAULT '["notification.created","notification.updated","notification.read","notification.dismissed"]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_webhook_workspace_id" ON "webhook" USING btree ("workspace_id");