"use client";

import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatDate, StatusPill } from "@/components/dashboard-format";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type JobsResponse = {
  items: Array<{
    apiKeyId: string | null;
    apiKeyPrefix: string | null;
    createdAt: string;
    id: string;
    processedAt: string | null;
    requestId: string;
    status: "success" | "failed";
    tokenCost: number;
  }>;
  nextOffset: number | null;
};

type JobDetailResponse = {
  job: {
    apiKeyPrefix: string | null;
    createdAt: string;
    errorCode: string | null;
    errorMessage: string | null;
    id: string;
    inputImageUrl: string | null;
    inputBucket: string | null;
    inputKey: string | null;
    outputs: Array<{
      bucket: string;
      height: number | null;
      id: string;
      key: string;
      mimeType: string | null;
      outputIndex: number;
      signedUrl: string | null;
      width: number | null;
    }>;
    processedAt: string | null;
    requestId: string;
    status: "success" | "failed";
    tokenCost: number;
  };
};

export default function RequestsPage() {
  const [jobs, setJobs] = useState<JobsResponse["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDetailResponse["job"] | null>(null);
  const [jobLoading, setJobLoading] = useState(false);

  async function fetchJobs() {
    const response = await fetch("/api/jobs?limit=25", {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch request history");
    }

    const data = (await response.json()) as JobsResponse;

    setJobs(data.items);
  }

  useEffect(() => {
    void (async () => {
      try {
        await fetchJobs();
      } catch (error) {
        console.error(error);
        toast.error("Failed to load request history");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refreshJobs() {
    setRefreshing(true);

    try {
      await fetchJobs();
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh request history");
    } finally {
      setRefreshing(false);
    }
  }

  async function openJobDetail(jobId: string) {
    setSelectedJobId(jobId);
    setJobLoading(true);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to load job detail");
      }

      const data = (await response.json()) as JobDetailResponse;

      setSelectedJob(data.job);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load request details");
      setSelectedJobId(null);
      setSelectedJob(null);
    } finally {
      setJobLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6">
      <Card className="border-[#2cf4ff]/20 bg-[#07101d]/80">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardDescription className="font-mono uppercase tracking-[0.14em] text-[#7d90aa]">
              Request History
            </CardDescription>
            <CardTitle className="font-display tracking-[0.08em] text-[#e8f7ff]">
              Past API Requests
            </CardTitle>
          </div>
          <Button
            variant="outline"
            onClick={() => void refreshJobs()}
            disabled={refreshing || loading}
            className="border-[#2cf4ff]/25 bg-[#2cf4ff]/10 font-mono uppercase tracking-[0.12em] text-[#9bf7ff] hover:bg-[#2cf4ff]/20"
          >
            <RefreshCw className={cn("size-3.5", refreshing || loading ? "animate-spin" : "")} aria-hidden />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border border-[#2cf4ff]/20">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#08101d] font-mono uppercase tracking-[0.12em] text-[#90a3ba]">
                <tr>
                  <th className="px-3 py-2">Request ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Tokens</th>
                  <th className="px-3 py-2">API key</th>
                  <th className="px-3 py-2">Processed</th>
                  <th className="px-3 py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center font-mono text-xs text-[#7d90aa]">
                      Loading request history...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center font-mono text-xs text-[#7d90aa]">
                      No API requests recorded yet.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-t border-[#2cf4ff]/15">
                      <td className="max-w-[240px] truncate px-3 py-2 font-mono text-[#d6e9ff]">
                        {job.requestId}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={job.status} />
                      </td>
                      <td className="px-3 py-2 font-mono text-[#9ab7d5]">{job.tokenCost}</td>
                      <td className="px-3 py-2 font-mono text-[#9ab7d5]">{job.apiKeyPrefix || "--"}</td>
                      <td className="px-3 py-2 text-[#9ab7d5]">{formatDate(job.processedAt || job.createdAt)}</td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          onClick={() => void openJobDetail(job.id)}
                          className="font-mono uppercase tracking-[0.12em] text-[#9bf7ff] hover:bg-[#2cf4ff]/10"
                        >
                          <ExternalLink className="size-3.5" aria-hidden />
                          View
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

      {selectedJobId ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="flex-1 bg-[#01050b]/80"
            onClick={() => {
              setSelectedJobId(null);
              setSelectedJob(null);
            }}
            aria-label="Close request details"
          />
          <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-[#2cf4ff]/25 bg-[#050910] p-5">
            {jobLoading || !selectedJob ? (
              <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.14em] text-[#7d90aa]">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Loading Request Detail
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7d90aa]">Request Detail</p>
                    <h2 className="mt-1 break-all font-display text-lg tracking-[0.06em] text-[#e8f7ff]">
                      {selectedJob.requestId}
                    </h2>
                  </div>
                  <StatusPill status={selectedJob.status} />
                </div>

                <div className="grid gap-2 border border-[#2cf4ff]/15 bg-[#08101b]/80 p-3 text-xs text-[#bdd2ec] sm:grid-cols-2">
                  <div>
                    <span className="font-mono uppercase tracking-[0.12em] text-[#7d90aa]">Token Cost</span>
                    <p className="mt-1 font-mono">{selectedJob.tokenCost}</p>
                  </div>
                  <div>
                    <span className="font-mono uppercase tracking-[0.12em] text-[#7d90aa]">API Key Prefix</span>
                    <p className="mt-1 font-mono">{selectedJob.apiKeyPrefix || "--"}</p>
                  </div>
                  <div>
                    <span className="font-mono uppercase tracking-[0.12em] text-[#7d90aa]">Processed At</span>
                    <p className="mt-1">{formatDate(selectedJob.processedAt || selectedJob.createdAt)}</p>
                  </div>
                  <div>
                    <span className="font-mono uppercase tracking-[0.12em] text-[#7d90aa]">Error Code</span>
                    <p className="mt-1">{selectedJob.errorCode || "--"}</p>
                  </div>
                </div>

                {selectedJob.errorMessage ? (
                  <div className="border border-[#ff5470]/25 bg-[#ff5470]/7 p-3 text-xs text-[#ffbdc7]">
                    <p className="font-mono uppercase tracking-[0.14em] text-[#ff95a9]">Error Message</p>
                    <p className="mt-1">{selectedJob.errorMessage}</p>
                  </div>
                ) : null}

                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7d90aa]">Input Image</h3>
                  {selectedJob.inputImageUrl ? (
                    <img
                      src={selectedJob.inputImageUrl}
                      alt="Input image"
                      className="w-full border border-[#2cf4ff]/20 bg-[#02060d] object-cover"
                    />
                  ) : (
                    <div className="border border-[#2cf4ff]/15 bg-[#08101b]/80 p-3 text-xs text-[#7d90aa]">
                      No input image
                    </div>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7d90aa]">Output Images</h3>
                  {selectedJob.outputs.length === 0 ? (
                    <div className="border border-[#2cf4ff]/15 bg-[#08101b]/80 p-3 text-xs text-[#7d90aa]">
                      No output images
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedJob.outputs.map((output) => (
                        <div key={output.id} className="space-y-1">
                          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7d90aa]">
                            Output #{output.outputIndex + 1}
                          </p>
                          {output.signedUrl ? (
                            <img
                              src={output.signedUrl}
                              alt={`Output ${output.outputIndex + 1}`}
                              className="w-full border border-[#2cf4ff]/20 bg-[#02060d] object-cover"
                            />
                          ) : (
                            <div className="border border-[#2cf4ff]/15 bg-[#08101b]/80 p-3 text-xs text-[#7d90aa]">
                              Missing image URL
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
