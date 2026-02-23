"use client";

import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createApiKeyAction, revokeApiKeyAction } from "@/app/api-keys/actions";
import { formatDate } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiKey } from "@segmentation/db/schema/app";

export function ApiKeysPageContent({ initialKeys }: { initialKeys: ApiKey[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKeyLabel, setNewKeyLabel] = useState("Production key");
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  useEffect(() => {
    setKeys(initialKeys);
  }, [initialKeys]);

  async function handleCreateApiKey() {
    setCreatingKey(true);

    try {
      const response = await createApiKeyAction({
        label: newKeyLabel,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to create key");
      }

      setNewlyCreatedSecret(response.plainTextKey);
      setKeys((current) => [
        response.apiKey,
        ...current.filter((key) => key.id !== response.apiKey.id),
      ]);
      setNewKeyLabel("Production key");
      toast.success("API key created");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create API key");
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeApiKey(keyId: string) {
    setRevokingKeyId(keyId);

    try {
      const response = await revokeApiKeyAction({
        keyId,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to revoke key");
      }

      setKeys((current) =>
        current.map((key) =>
          key.id === keyId
            ? {
                ...key,
                revoked: true,
                revokedAt: key.revokedAt ?? new Date(),
              }
            : key,
        ),
      );
      toast.success("API key revoked");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to revoke API key");
    } finally {
      setRevokingKeyId(null);
    }
  }

  return (
    <>
      <Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
            API Keys
          </CardDescription>
          <CardTitle className="font-display tracking-[0.03em] text-foreground">
            Key Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={newKeyLabel}
              onChange={(event) => setNewKeyLabel(event.target.value)}
              placeholder="Label"
              className="border-input bg-background/60"
            />
            <Button
              onClick={handleCreateApiKey}
              disabled={creatingKey}
              className="w-full border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30 sm:w-auto"
            >
              {creatingKey ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Creating
                </>
              ) : (
                <>
                  <KeyRound className="size-3.5" aria-hidden />
                  Create Key
                </>
              )}
            </Button>
          </div>

          {newlyCreatedSecret ? (
            <div className="rounded-xl border border-secondary/45 bg-secondary/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 text-secondary" aria-hidden />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-secondary">
                    Copy this key now
                  </p>
                  <p className="mt-1 break-all rounded-md bg-background/45 p-2 font-mono text-xs leading-relaxed text-foreground">
                    {newlyCreatedSecret}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 md:hidden">
            {keys.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-card/55 px-3 py-6 text-center font-mono text-xs text-muted-foreground">
                No API keys yet.
              </div>
            ) : (
              keys.map((key) => (
                <article key={key.id} className="rounded-xl border border-border/70 bg-card/55 p-3">
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Label
                    </p>
                    <p className="text-sm text-foreground">{key.label}</p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Prefix
                    </p>
                    <p className="break-all font-mono text-xs text-muted-foreground">{key.keyPrefix}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Status
                      </p>
                      {key.revoked ? (
                        <span className="font-mono uppercase tracking-[0.12em] text-destructive">
                          revoked
                        </span>
                      ) : (
                        <span className="font-mono uppercase tracking-[0.12em] text-secondary">
                          active
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Created
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(key.createdAt)}</p>
                    </div>
                  </div>
                  <Button
                    disabled={key.revoked || revokingKeyId === key.id}
                    onClick={() => void handleRevokeApiKey(key.id)}
                    variant="outline"
                    className="mt-3 w-full border-destructive/35 bg-destructive/10 font-mono uppercase tracking-[0.12em] text-destructive hover:bg-destructive/20"
                  >
                    {revokingKeyId === key.id ? "Revoking" : "Revoke"}
                  </Button>
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card/55 md:block">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-muted/65 font-mono uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Prefix</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
                      No API keys yet.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground">{key.label}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{key.keyPrefix}</td>
                      <td className="px-3 py-2">
                        {key.revoked ? (
                          <span className="font-mono uppercase tracking-[0.12em] text-destructive">
                            revoked
                          </span>
                        ) : (
                          <span className="font-mono uppercase tracking-[0.12em] text-secondary">
                            active
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(key.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          disabled={key.revoked || revokingKeyId === key.id}
                          onClick={() => void handleRevokeApiKey(key.id)}
                          variant="outline"
                          className="border-destructive/35 bg-destructive/10 font-mono uppercase tracking-[0.12em] text-destructive hover:bg-destructive/20"
                        >
                          {revokingKeyId === key.id ? "Revoking" : "Revoke"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function ApiKeysPage({ initialKeys }: { initialKeys: ApiKey[] }) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
      <ApiKeysPageContent initialKeys={initialKeys} />
    </main>
  );
}
