"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { setActiveApiKeyAction } from "./user-menu-actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [activeApiKeyInput, setActiveApiKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const lastSavedValueRef = useRef<string | null>(null);

  async function handleSetActiveApiKey(apiKey: string) {
    setError(null);
    setIsSavingApiKey(true);

    try {
      const response = await setActiveApiKeyAction({
        apiKey,
      });

      if (!response.ok) {
        setError(response.error);
        toast.error(response.error);
        return;
      }

      lastSavedValueRef.current = apiKey.trim();
      setActiveApiKeyInput("");
      toast.success("Active API key updated");
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Failed to save API key");
      toast.error("Failed to save API key");
    } finally {
      setIsSavingApiKey(false);
    }
  }

  useEffect(() => {
    const trimmedValue = activeApiKeyInput.trim();

    if (!trimmedValue || trimmedValue === lastSavedValueRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSetActiveApiKey(trimmedValue);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [activeApiKeyInput]);

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
      <DropdownMenuContent
        align="end"
        className="w-80 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md"
      >
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="text-sm font-medium text-foreground">{session.user.name}</p>
            <p className="break-all text-xs text-muted-foreground">{session.user.email}</p>
          </div>
          <div
            className="space-y-2 rounded-md px-1 py-1"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              <Label
                htmlFor="active-api-key-input"
                className="text-xs font-medium text-foreground"
              >
                Active API Key
              </Label>
              <Input
                id="active-api-key-input"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={activeApiKeyInput}
                onChange={(event) => {
                  setActiveApiKeyInput(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="Paste active API key"
                className="rounded-md border-border bg-background"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">Paste a valid sk_live_... key.</p>
              {isSavingApiKey ? (
                <p className="shrink-0 text-[11px] text-muted-foreground">Saving...</p>
              ) : null}
            </div>
            {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
          </div>
          <div className="border-t border-border pt-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
