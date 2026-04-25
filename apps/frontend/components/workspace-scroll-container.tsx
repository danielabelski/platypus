"use client";

import { useSWRConfig } from "swr";
import { PullToRefresh } from "@/components/pull-to-refresh";

export function WorkspaceScrollContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { mutate } = useSWRConfig();

  async function handleRefresh() {
    await mutate(() => true, undefined, { revalidate: true });
  }

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden"
    >
      {children}
    </PullToRefresh>
  );
}
