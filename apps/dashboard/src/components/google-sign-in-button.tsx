"use client";

import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.18v2.82h5.34c-.23 1.49-1.62 4.36-5.34 4.36a6.11 6.11 0 0 1 0-12.22 5.5 5.5 0 0 1 3.88 1.51l2.29-2.2A8.85 8.85 0 0 0 12.17 3 9.17 9.17 0 1 0 21.35 12c0-.6-.06-.93 0-.9Z"
      />
    </svg>
  );
}

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
      <GoogleIcon className="mr-2 size-4" />
      Continue with Google
    </Button>
  );
}
