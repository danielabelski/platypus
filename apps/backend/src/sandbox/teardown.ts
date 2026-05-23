import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "../index.ts";
import {
  sandbox as sandboxTable,
  sandboxTeardownFailure as sandboxTeardownFailureTable,
} from "../db/schema.ts";
import { logger } from "../logger.ts";
import { getSandboxBackend } from "./index.ts";

type SandboxRow = typeof sandboxTable.$inferSelect;

// Resolves the adapter for a sandbox row and invokes its destroy() with the
// row's workspace context. Throws on any failure — adapter not registered,
// config/credentials invalid, or the adapter's destroy() rejecting. The user-
// initiated DELETE path uses this; the row should remain in place on failure
// so the user can retry (or force-delete).
export const destroySandboxRow = async (row: SandboxRow): Promise<void> => {
  const registration = getSandboxBackend(row.backend);
  if (!registration) {
    throw new Error(
      `Sandbox backend '${row.backend}' is not registered; cannot destroy`,
    );
  }

  const configResult = registration.configSchema.safeParse(row.config ?? {});
  if (!configResult.success) {
    throw new Error(
      `Sandbox config failed adapter validation: ${configResult.error.message}`,
    );
  }

  const credentialsResult = registration.credentialsSchema.safeParse(
    row.credentials ?? {},
  );
  if (!credentialsResult.success) {
    throw new Error(
      `Sandbox credentials failed adapter validation: ${credentialsResult.error.message}`,
    );
  }

  const backend = registration.create(
    configResult.data,
    credentialsResult.data,
  );
  await backend.destroy({
    orgId: "",
    workspaceId: row.workspaceId,
    userId: "",
  });
};

// Best-effort teardown for every sandbox row in the given workspace. Used by
// the Workspace cascade path — must never throw and must never block Workspace
// deletion. Failures are recorded in sandbox_teardown_failure so an operator
// can reconcile leaked external resources out-of-band.
export const destroyWorkspaceSandboxes = async (
  workspaceId: string,
): Promise<void> => {
  const rows = await db
    .select()
    .from(sandboxTable)
    .where(eq(sandboxTable.workspaceId, workspaceId));

  await Promise.all(
    rows.map(async (row) => {
      try {
        await destroySandboxRow(row);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(
          { workspaceId, sandboxId: row.id, backend: row.backend, err },
          "Sandbox destroy() failed during workspace cascade; recording ledger entry",
        );
        try {
          await db.insert(sandboxTeardownFailureTable).values({
            id: nanoid(),
            workspaceId,
            backend: row.backend,
            config: row.config ?? {},
            error: message,
          });
        } catch (ledgerErr) {
          logger.error(
            { workspaceId, sandboxId: row.id, err: ledgerErr },
            "Failed to record sandbox teardown failure",
          );
        }
      }
    }),
  );
};
