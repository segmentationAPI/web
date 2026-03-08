"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { docsNavGroups } from "@/components/docs-config";

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" className="border-sidebar-border/40 top-[73px] h-[calc(100svh-73px)]!">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold tracking-wide text-sidebar-foreground">
            Documentation
          </span>
          <SidebarTrigger className="md:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {docsNavGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sidebar-foreground/50">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      render={<Link href={item.href} />}
                      tooltip={item.title}
                    >
                      <item.icon className="opacity-60" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export function DocsMobileTrigger() {
  return (
    <div className="fixed bottom-5 right-5 z-50 md:hidden">
      <SidebarTrigger className="h-12 w-12 rounded-full border border-primary/50 bg-linear-to-br from-primary/90 to-primary/70 text-primary-foreground shadow-[0_8px_32px_rgba(255,112,63,0.4)] hover:shadow-[0_12px_40px_rgba(255,112,63,0.5)]" />
    </div>
  );
}
