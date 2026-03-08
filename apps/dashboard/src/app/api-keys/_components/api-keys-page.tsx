"use client";

import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createApiKeyAction, revokeApiKeyAction } from "@/app/api-keys/actions";
import { formatDate } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <Card className="glass-panel border-border/70 bg-card/75 rounded-[1.35rem] py-6">
        <CardHeader>
          <CardDescription className="text-muted-foreground font-mono tracking-[0.14em] uppercase">
            API Keys
          </CardDescription>
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
              className="border-primary/45 bg-primary/20 text-foreground hover:bg-primary/30 w-full border font-mono tracking-[0.14em] uppercase sm:w-auto"
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
            <div className="border-secondary/45 bg-secondary/10 rounded-xl border p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-secondary mt-0.5 size-4" aria-hidden />
                <div>
                  <p className="text-secondary font-mono text-[11px] tracking-[0.14em] uppercase">
                    Copy this key now
                  </p>
                  <p className="bg-background/45 text-foreground mt-1 rounded-md p-2 font-mono text-xs leading-relaxed break-all">
                    {newlyCreatedSecret}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 md:hidden">
            {keys.length === 0 ? (
              <div className="border-border/70 bg-card/55 text-muted-foreground rounded-xl border px-3 py-6 text-center font-mono text-xs">
                No API keys yet.
              </div>
            ) : (
              keys.map((key) => (
                <article key={key.id} className="border-border/70 bg-card/55 rounded-xl border p-3">
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
                      Label
                    </p>
                    <p className="text-foreground text-sm">{key.label}</p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
                      Prefix
                    </p>
                    <p className="text-muted-foreground font-mono text-xs break-all">
                      {key.keyPrefix}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
                        Status
                      </p>
                      {key.revoked ? (
                        <span className="text-destructive font-mono tracking-[0.12em] uppercase">
                          revoked
                        </span>
                      ) : (
                        <span className="text-secondary font-mono tracking-[0.12em] uppercase">
                          active
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground font-mono text-[11px] tracking-[0.12em] uppercase">
                        Created
                      </p>
                      <p className="text-muted-foreground text-xs">{formatDate(key.createdAt)}</p>
                    </div>
                  </div>
                  <Button
                    disabled={key.revoked || revokingKeyId === key.id}
                    onClick={() => void handleRevokeApiKey(key.id)}
                    variant="outline"
                    className="border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/20 mt-3 w-full font-mono tracking-[0.12em] uppercase"
                  >
                    {revokingKeyId === key.id ? "Revoking" : "Revoke"}
                  </Button>
                </article>
              ))
            )}
          </div>

          <div className="border-border/70 bg-card/55 hidden overflow-x-auto rounded-xl border md:block">
            <Table className="min-w-full text-left text-xs">
              <TableHeader className="bg-muted/65 text-muted-foreground font-mono tracking-[0.12em] uppercase">
                <TableRow>
                  <TableHead className="px-3 py-2">Label</TableHead>
                  <TableHead className="px-3 py-2">Prefix</TableHead>
                  <TableHead className="px-3 py-2">Status</TableHead>
                  <TableHead className="px-3 py-2">Created</TableHead>
                  <TableHead className="px-3 py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground px-3 py-6 text-center font-mono text-xs"
                    >
                      No API keys yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((key) => (
                    <TableRow key={key.id} className="border-border/60 border-t">
                      <TableCell className="text-foreground px-3 py-2">{key.label}</TableCell>
                      <TableCell className="text-muted-foreground px-3 py-2 font-mono">
                        {key.keyPrefix}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {key.revoked ? (
                          <span className="text-destructive font-mono tracking-[0.12em] uppercase">
                            revoked
                          </span>
                        ) : (
                          <span className="text-secondary font-mono tracking-[0.12em] uppercase">
                            active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground px-3 py-2">
                        {formatDate(key.createdAt)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <Button
                          disabled={key.revoked || revokingKeyId === key.id}
                          onClick={() => void handleRevokeApiKey(key.id)}
                          variant="outline"
                          className="border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/20 font-mono tracking-[0.12em] uppercase"
                        >
                          {revokingKeyId === key.id ? "Revoking" : "Revoke"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function ApiKeysPage({ initialKeys }: { initialKeys: ApiKey[] }) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 pt-3 pb-8 sm:gap-5 sm:px-6 sm:pt-4 sm:pb-10">
      <ApiKeysPageContent initialKeys={initialKeys} />
    </main>
  );
}
