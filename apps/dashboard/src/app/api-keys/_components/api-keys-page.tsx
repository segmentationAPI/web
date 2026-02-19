"use client";

import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatDate } from "@/components/dashboard-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ApiKeyRow = {
  createdAt: string;
  id: string;
  keyPrefix: string;
  label: string;
  revoked: boolean;
  revokedAt: string | null;
};

export function ApiKeysPageContent() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyLabel, setNewKeyLabel] = useState("Production key");
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  async function fetchApiKeys() {
    const response = await fetch("/api/api-keys", {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch API keys");
    }

    const data = (await response.json()) as {
      keys: ApiKeyRow[];
    };

    setKeys(data.keys);
  }

  useEffect(() => {
    void (async () => {
      try {
        await fetchApiKeys();
      } catch (error) {
        console.error(error);
        toast.error("Failed to load API keys");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreateApiKey() {
    setCreatingKey(true);

    try {
      const response = await fetch("/api/api-keys", {
        body: JSON.stringify({
          label: newKeyLabel,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create key");
      }

      const data = (await response.json()) as {
        plainTextKey: string;
      };

      setNewlyCreatedSecret(data.plainTextKey);
      setNewKeyLabel("Production key");
      toast.success("API key created");
      await fetchApiKeys();
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
      const response = await fetch(`/api/api-keys/${keyId}/revoke`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke key");
      }

      toast.success("API key revoked");
      await fetchApiKeys();
    } catch (error) {
      console.error(error);
      toast.error("Failed to revoke API key");
    } finally {
      setRevokingKeyId(null);
    }
  }

  return (
    <>
      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-[0.14em] text-[#7d90aa]">
            API Keys
          </CardDescription>
          <CardTitle className="font-display tracking-[0.08em] text-[#e8f7ff]">Key Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={newKeyLabel}
              onChange={(event) => setNewKeyLabel(event.target.value)}
              placeholder="Label"
              className="border-[#2cf4ff]/30 bg-[#040912]"
            />
            <Button
              onClick={handleCreateApiKey}
              disabled={creatingKey}
              className="border border-[#2cf4ff]/30 bg-[#2cf4ff]/15 font-mono uppercase tracking-[0.14em] text-[#a8f8ff] hover:bg-[#2cf4ff]/25"
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
            <div className="rounded-none border border-[#8eff6f]/40 bg-[#8eff6f]/8 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 text-[#8eff6f]" aria-hidden />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#b8ffaa]">
                    Copy this key now
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-[#d5ffd2]">{newlyCreatedSecret}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto border border-[#2cf4ff]/20">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#08101d] font-mono uppercase tracking-[0.12em] text-[#90a3ba]">
                <tr>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Prefix</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center font-mono text-xs text-[#7d90aa]">
                      Loading API keys...
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center font-mono text-xs text-[#7d90aa]">
                      No API keys yet.
                    </td>
                  </tr>
                ) : (
                  keys.map((key) => (
                    <tr key={key.id} className="border-t border-[#2cf4ff]/15">
                      <td className="px-3 py-2 text-[#d6e9ff]">{key.label}</td>
                      <td className="px-3 py-2 font-mono text-[#9ab7d5]">{key.keyPrefix}</td>
                      <td className="px-3 py-2">
                        {key.revoked ? (
                          <span className="font-mono uppercase tracking-[0.12em] text-[#ff8c9d]">revoked</span>
                        ) : (
                          <span className="font-mono uppercase tracking-[0.12em] text-[#8eff6f]">active</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[#9ab7d5]">{formatDate(key.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          disabled={key.revoked || revokingKeyId === key.id}
                          onClick={() => void handleRevokeApiKey(key.id)}
                          variant="outline"
                          className="border-[#ff5470]/30 bg-[#ff5470]/10 font-mono uppercase tracking-[0.12em] text-[#ff9fb0] hover:bg-[#ff5470]/20"
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

export default function ApiKeysPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <ApiKeysPageContent />
    </main>
  );
}
