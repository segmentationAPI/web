import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
        <Button variant="outline" className="h-9 px-3 font-mono uppercase tracking-[0.12em]">
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
      <DropdownMenuContent align="end" className="w-64 bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="break-all text-[11px]">{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
