"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-20 sm:w-24" />;
  }

  if (!session) {
    return (
      <Link href="/login">
        <Button variant="outline" className="h-9 px-3 font-mono tracking-[0.12em] uppercase">
          Sign In
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="h-9 max-w-[8.5rem] justify-start overflow-hidden px-2.5 sm:max-w-[12rem]"
          />
        }
      >
        <span className="truncate">{session.user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border bg-popover text-popover-foreground w-80 rounded-lg border p-2 shadow-md"
      >
        <div className="space-y-2">
          <div className="border-border bg-muted/30 rounded-md border px-3 py-2">
            <p className="text-foreground text-sm font-medium">{session.user.name}</p>
            <p className="text-muted-foreground text-xs break-all">{session.user.email}</p>
          </div>
          <div className="border-border border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start rounded-md"
              onClick={() => {
                void authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/");
                    },
                  },
                });
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
