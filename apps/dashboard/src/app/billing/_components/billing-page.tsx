"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BillingPageContent() {
  return (
    <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Buy Credits
        </CardDescription>
        <CardTitle className="font-display tracking-[0.03em] text-foreground">
          Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 font-mono text-[12px] text-amber-200">
          Payments are currently under construction. Please try again later.
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <BillingPageContent />
    </main>
  );
}
