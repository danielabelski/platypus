CREATE TABLE "mcp_oauth_state" (
	"id" text PRIMARY KEY NOT NULL,
	"mcp_id" text NOT NULL,
	"code_verifier" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp" ADD COLUMN "oauth_access_token" text;--> statement-breakpoint
ALTER TABLE "mcp" ADD COLUMN "oauth_refresh_token" text;--> statement-breakpoint
ALTER TABLE "mcp" ADD COLUMN "oauth_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "mcp" ADD COLUMN "oauth_scope" text;--> statement-breakpoint
ALTER TABLE "mcp" ADD COLUMN "oauth_client_id" text;--> statement-breakpoint
ALTER TABLE "mcp" ADD COLUMN "oauth_client_secret" text;--> statement-breakpoint
ALTER TABLE "mcp_oauth_state" ADD CONSTRAINT "mcp_oauth_state_mcp_id_mcp_id_fk" FOREIGN KEY ("mcp_id") REFERENCES "public"."mcp"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mcp_oauth_state_mcp_id" ON "mcp_oauth_state" USING btree ("mcp_id");