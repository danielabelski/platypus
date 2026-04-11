CREATE TABLE IF NOT EXISTS "trigger" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instruction" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"max_chats_to_keep" integer DEFAULT 50 NOT NULL,
	"search" boolean DEFAULT false NOT NULL,
	"config" jsonb NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trigger_run" (
	"id" text PRIMARY KEY NOT NULL,
	"trigger_id" text NOT NULL,
	"chat_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"event_type" text,
	"event_data" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" DROP CONSTRAINT IF EXISTS "chat_schedule_id_schedule_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_chat_schedule_id";--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'schedule') THEN
    ALTER TABLE "schedule" DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'schedule_run') THEN
    ALTER TABLE "schedule_run" DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "schedule" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "schedule_run" CASCADE;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN IF NOT EXISTS "trigger_id" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "trigger" ADD CONSTRAINT "trigger_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "trigger" ADD CONSTRAINT "trigger_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "trigger_run" ADD CONSTRAINT "trigger_run_trigger_id_trigger_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."trigger"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "trigger_run" ADD CONSTRAINT "trigger_run_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trigger_workspace_id" ON "trigger" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trigger_next_run_at" ON "trigger" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trigger_type" ON "trigger" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trigger_run_trigger_id" ON "trigger_run" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trigger_run_started_at" ON "trigger_run" USING btree ("started_at");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chat" ADD CONSTRAINT "chat_trigger_id_trigger_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."trigger"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_trigger_id" ON "chat" USING btree ("trigger_id");--> statement-breakpoint
ALTER TABLE "chat" DROP COLUMN IF EXISTS "schedule_id";