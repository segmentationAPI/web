"use client";

import { DocsMobileTrigger, DocsSidebar } from "@/components/docs-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      className="min-h-0!"
      style={
        {
          "--background": "transparent",
          "--sidebar": "rgba(6, 7, 13, 0.7)",
        } as React.CSSProperties
      }
    >
      <DocsSidebar />
      <SidebarInset className="bg-transparent">
        <div className="docs-content">{children}</div>
      </SidebarInset>
      <DocsMobileTrigger />
    </SidebarProvider>
  );
}
