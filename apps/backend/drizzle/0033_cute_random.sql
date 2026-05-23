CREATE TABLE "sandbox_teardown_failure" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"backend" text NOT NULL,
	"config" jsonb NOT NULL,
	"error" text NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_sandbox_teardown_failure_workspace_id" ON "sandbox_teardown_failure" USING btree ("workspace_id");