"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function WorkspaceShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="min-h-0 h-dvh">
      <AppSidebar />
      {children}
    </SidebarProvider>
  );
}
