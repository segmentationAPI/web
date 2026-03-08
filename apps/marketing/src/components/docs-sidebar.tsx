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
    <Sidebar
      collapsible="offcanvas"
      className="border-sidebar-border/40 top-[73px] h-[calc(100svh-73px)]!"
    >
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-sidebar-foreground text-sm font-semibold tracking-wide">
            Documentation
          </span>
          <SidebarTrigger className="md:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {docsNavGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 font-mono text-[0.6rem] tracking-[0.18em] uppercase">
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
    <div className="fixed right-5 bottom-5 z-50 md:hidden">
      <SidebarTrigger className="border-primary/50 from-primary/90 to-primary/70 text-primary-foreground h-12 w-12 rounded-full border bg-linear-to-br shadow-[0_8px_32px_rgba(255,112,63,0.4)] hover:shadow-[0_12px_40px_rgba(255,112,63,0.5)]" />
    </div>
  );
}
