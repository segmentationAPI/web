"use client";

import { Chrome } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function GoogleSignInButton({ callbackURL }: { callbackURL: string }) {
  return (
    <Button
      type="button"
      className="w-full"
      onClick={async () => {
        await authClient.signIn.social(
          {
            provider: "google",
            callbackURL,
          },
          {
            onError: (error) => {
              toast.error(error.error.message || error.error.statusText);
            },
          },
        );
      }}
    >
      <Chrome className="mr-2 size-4" />
      Continue with Google
    </Button>
  );
}
