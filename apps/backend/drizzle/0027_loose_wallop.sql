CREATE TABLE "memory_daily_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"summary_date" date NOT NULL,
	"summary" text NOT NULL,
	"embedding" vector,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_daily_summary_user_workspace_date" UNIQUE("user_id","workspace_id","summary_date")
);
--> statement-breakpoint
ALTER TABLE "memory" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "memory" CASCADE;--> statement-breakpoint
ALTER TABLE "provider" ADD COLUMN "embedding_model_id" text;--> statement-breakpoint
ALTER TABLE "provider" ADD COLUMN "embedding_dimensions" integer;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "memory_embedding_provider_id" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "max_daily_summaries" integer DEFAULT 90;--> statement-breakpoint
ALTER TABLE "memory_daily_summary" ADD CONSTRAINT "memory_daily_summary_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_daily_summary" ADD CONSTRAINT "memory_daily_summary_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_daily_summary_user_workspace" ON "memory_daily_summary" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "idx_daily_summary_date" ON "memory_daily_summary" USING btree ("summary_date");--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_memory_embedding_provider_id_provider_id_fk" FOREIGN KEY ("memory_embedding_provider_id") REFERENCES "public"."provider"("id") ON DELETE set null ON UPDATE no action;