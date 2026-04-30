import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../index.ts";
import { memoryDailySummary as memoryDailySummaryTable } from "../db/schema.ts";

export type MemorySummary = typeof memoryDailySummaryTable.$inferSelect;

/**
 * Retrieves the most recent daily summaries for a user in a workspace.
 */
export async function retrieveRecentSummaries(
  userId: string,
  workspaceId: string,
  days: number = 2,
): Promise<MemorySummary[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

  return db
    .select()
    .from(memoryDailySummaryTable)
    .where(
      and(
        eq(memoryDailySummaryTable.userId, userId),
        eq(memoryDailySummaryTable.workspaceId, workspaceId),
        sql`${memoryDailySummaryTable.summaryDate} >= ${cutoffDateStr}`,
      ),
    )
    .orderBy(desc(memoryDailySummaryTable.summaryDate));
}

/**
 * Formats daily summaries for injection into the system prompt.
 */
export function formatSummariesForSystemPrompt(
  summaries: MemorySummary[],
): string {
  const withContent = summaries.filter((s) => s.summary.trim());
  if (withContent.length === 0) {
    return "";
  }

  const parts = ["Recent memory summaries from previous conversations:", ""];

  for (const summary of withContent) {
    parts.push(`### ${summary.summaryDate}`);
    parts.push(summary.summary);
    parts.push("");
  }

  return parts.join("\n").trim();
}
