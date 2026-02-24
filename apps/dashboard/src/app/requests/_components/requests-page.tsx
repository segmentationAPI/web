'use client';

import { ExternalLink, Loader2, RefreshCw, X } from 'lucide-react';
import type { Route } from 'next';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { formatDate, StatusPill } from '@/components/dashboard-format';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type { JobDetail, JobListItem } from '@/lib/dashboard-types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const MASK_OVERLAY_COLORS = [
	'#ff703f',
	'#39d5c9',
	'#f2b77a',
	'#74e8a5',
	'#f95f8e',
	'#ffeecc',
];

function buildMaskTintStyle(maskUrl: string, color: string) {
	return {
		backgroundBlendMode: 'multiply',
		backgroundImage: `linear-gradient(${color}, ${color}), url("${maskUrl}")`,
		backgroundPosition: 'center, center',
		backgroundRepeat: 'no-repeat, no-repeat',
		backgroundSize: '100% 100%, 100% 100%',
		mixBlendMode: 'screen' as const,
		opacity: 0.7,
	};
}

type RequestsPageContentProps = {
	jobs: JobListItem[];
	selectedJob: JobDetail | null;
	selectedJobId: string | null;
};

export function RequestsPageContent({
	jobs,
	selectedJob,
	selectedJobId,
}: RequestsPageContentProps) {
	const router = useRouter();
	const [pendingJobId, setPendingJobId] = useState<string | null>(null);
	const [refreshing, startRefreshing] = useTransition();
	const [navigating, startNavigating] = useTransition();

	useEffect(() => {
		setPendingJobId(null);
	}, [selectedJobId]);

	function refreshJobs() {
		startRefreshing(() => {
			router.refresh();
		});
	}

	function openJobDetail(jobId: string) {
		setPendingJobId(jobId);
		startNavigating(() => {
			router.push(`/requests?jobId=${encodeURIComponent(jobId)}`);
		});
	}

	function closeJobDetail() {
		setPendingJobId(null);
		startNavigating(() => {
			router.push('/requests');
		});
	}

	const activeJobId = pendingJobId ?? selectedJobId;
	const showDrawer = activeJobId !== null;
	const jobLoading = pendingJobId !== null || navigating;

	return (
		<>
			<Card className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 py-6">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardDescription className="font-mono uppercase tracking-[0.14em] text-muted-foreground">
							Request History
						</CardDescription>
						<CardTitle className="font-display tracking-[0.03em] text-foreground">
							Past API Requests
						</CardTitle>
					</div>
					<Button
						variant="outline"
						onClick={refreshJobs}
						disabled={refreshing}
						className="w-full border-primary/35 bg-primary/15 font-mono uppercase tracking-[0.12em] text-foreground hover:bg-primary/25 sm:w-auto"
					>
						<RefreshCw
							className={cn('size-3.5', refreshing ? 'animate-spin' : '')}
							aria-hidden
						/>
						Refresh
					</Button>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="space-y-3 md:hidden">
						{jobs.length === 0 ? (
							<div className="rounded-xl border border-border/70 bg-card/55 px-3 py-8 text-center font-mono text-xs text-muted-foreground">
								No API requests recorded yet.
							</div>
						) : (
							jobs.map(job => (
								<article
									key={job.id}
									className="rounded-xl border border-border/70 bg-card/55 p-3"
								>
									<p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
										Job ID
									</p>
									<p className="mt-1 break-all font-mono text-xs text-foreground">
										{job.id}
									</p>
									<div className="mt-3 flex items-center justify-between gap-2">
										<span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
											Status
										</span>
										<StatusPill status={job.status} />
									</div>
									<div className="mt-3 grid gap-2 sm:grid-cols-2">
										<div>
											<p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
												API key
											</p>
											<p className="mt-1 break-all font-mono text-xs text-muted-foreground">
												{job.apiKeyPrefix || '--'}
											</p>
										</div>
										<div>
											<p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
												Created
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{formatDate(job.createdAt)}
											</p>
										</div>
										<div>
											<p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
												Modality
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{job.modality}
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										onClick={() => openJobDetail(job.id)}
										disabled={navigating && pendingJobId === job.id}
										className="mt-3 w-full font-mono uppercase tracking-[0.12em] text-primary hover:bg-primary/10"
									>
										<ExternalLink className="size-3.5" aria-hidden />
										View
									</Button>
								</article>
							))
						)}
					</div>

					<div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card/55 md:block">
						<table className="min-w-full text-left text-xs">
							<thead className="bg-muted/65 font-mono uppercase tracking-[0.12em] text-muted-foreground">
								<tr>
									<th className="px-3 py-2">Job ID</th>
									<th className="px-3 py-2">Modality</th>
									<th className="px-3 py-2">Status</th>
									<th className="px-3 py-2">API key</th>
									<th className="px-3 py-2">Created</th>
									<th className="px-3 py-2">Open</th>
								</tr>
							</thead>
							<tbody>
								{jobs.length === 0 ? (
									<tr>
										<td
											colSpan={6}
											className="px-3 py-8 text-center font-mono text-xs text-muted-foreground"
										>
											No API requests recorded yet.
										</td>
									</tr>
								) : (
									jobs.map(job => (
										<tr key={job.id} className="border-t border-border/60">
											<td className="max-w-[240px] truncate px-3 py-2 font-mono text-foreground">
												{job.id}
											</td>
											<td className="px-3 py-2 text-muted-foreground">
												{job.modality}
											</td>
											<td className="px-3 py-2">
												<StatusPill status={job.status} />
											</td>
											<td className="px-3 py-2 font-mono text-muted-foreground">
												{job.apiKeyPrefix || '--'}
											</td>
											<td className="px-3 py-2 text-muted-foreground">
												{formatDate(job.createdAt)}
											</td>
											<td className="px-3 py-2">
												<Button
													variant="ghost"
													onClick={() => openJobDetail(job.id)}
													disabled={navigating && pendingJobId === job.id}
													className="font-mono uppercase tracking-[0.12em] text-primary hover:bg-primary/10"
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

			{showDrawer ? (
				<div className="fixed inset-0 z-50 md:flex">
					<button
						type="button"
						className="hidden flex-1 bg-background/80 md:block"
						onClick={closeJobDetail}
						aria-label="Close request details"
					/>
					<aside className="flex h-full w-full flex-col border-l border-border/70 bg-card md:ml-auto md:max-w-2xl">
						<div className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur-sm sm:px-5">
							<div className="flex items-center justify-between gap-3">
								<p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
									Request Detail
								</p>
								<Button
									variant="outline"
									onClick={closeJobDetail}
									className="font-mono uppercase tracking-[0.12em]"
								>
									<X className="size-3.5" aria-hidden />
									Close
								</Button>
							</div>
							{selectedJob ? (
								<p className="mt-2 break-all font-display text-base tracking-[0.03em] text-foreground sm:text-lg">
									{selectedJob.id}
								</p>
							) : null}
						</div>

						<div className="flex-1 overflow-y-auto p-4 sm:p-5">
							{jobLoading ? (
								<div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
									<Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
									Loading Request Detail
								</div>
							) : !selectedJob ? (
								<div className="rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-xs text-destructive">
									Unable to load this request detail.
								</div>
							) : (
								<div className="space-y-5">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
												Current Status
											</p>
										</div>
										<StatusPill status={selectedJob.status} />
									</div>

									<div className="grid gap-2 rounded-xl border border-border/70 bg-muted/55 p-3 text-xs text-foreground sm:grid-cols-2">
										<div>
											<span className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
												Created At
											</span>
											<p className="mt-1">
												{formatDate(selectedJob.createdAt)}
											</p>
										</div>
										<div className="sm:col-span-2">
											<span className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
												Modality
											</span>
											<p className="mt-1">{selectedJob.modality}</p>
										</div>
										<div className="sm:col-span-2">
											<span className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
												Prompts
											</span>
											<p className="mt-1 break-words">
												{selectedJob.prompts?.length
													? selectedJob.prompts.join(', ')
													: '--'}
											</p>
										</div>
									</div>

									{selectedJob.errorMessage ? (
										<div className="rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-xs text-destructive">
											<p className="font-mono uppercase tracking-[0.14em] text-destructive">
												Error Message
											</p>
											<p className="mt-1">{selectedJob.errorMessage}</p>
										</div>
									) : null}

									{selectedJob.modality === 'video' ? (
										<section className="space-y-3">
											<h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
												Video Output Summary
											</h3>
											{selectedJob.inputVideoUrl ? (
												<video
													src={selectedJob.inputVideoUrl}
													controls
													className="w-full overflow-hidden rounded-xl border border-border/70 bg-background/80"
												/>
											) : (
												<div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-xs text-muted-foreground">
													Missing input video preview
												</div>
											)}
											{selectedJob.videoOutput ? (
												<div className="space-y-3 rounded-xl border border-border/70 bg-muted/55 p-3 text-xs text-foreground">
													<div className="grid gap-2 sm:grid-cols-3">
														<div>
															<p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
																Frames Processed
															</p>
															<p className="mt-1">{selectedJob.videoOutput.framesProcessed}</p>
														</div>
														<div>
															<p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
																Frames With Masks
															</p>
															<p className="mt-1">{selectedJob.videoOutput.framesWithMasks}</p>
														</div>
														<div>
															<p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
																Total Masks
															</p>
															<p className="mt-1">{selectedJob.videoOutput.totalMasks}</p>
														</div>
													</div>
													<div>
														<p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
															Mask Encoding
														</p>
														<p className="mt-1">{selectedJob.videoOutput.maskEncoding}</p>
													</div>
													<div className="grid gap-2 sm:grid-cols-2">
														<a
															href={selectedJob.videoOutput.manifestUrl}
															target="_blank"
															rel="noreferrer"
															className="inline-flex items-center gap-1 text-primary hover:underline"
														>
															<ExternalLink className="size-3.5" aria-hidden />
															Manifest URL
														</a>
														<a
															href={selectedJob.videoOutput.framesUrl}
															target="_blank"
															rel="noreferrer"
															className="inline-flex items-center gap-1 text-primary hover:underline"
														>
															<ExternalLink className="size-3.5" aria-hidden />
															Frames URL
														</a>
													</div>
													<div>
														<p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
															Output Prefix
														</p>
														<p className="mt-1 break-all">{selectedJob.videoOutput.outputS3Prefix}</p>
													</div>
												</div>
											) : (
												<div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-xs text-muted-foreground">
													No video output metadata available.
												</div>
											)}
										</section>
									) : (
										<section className="space-y-2">
											<h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
												Input + Combined Masks
											</h3>
											{selectedJob.outputs.length === 0 ? (
												<div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-xs text-muted-foreground">
													No output images
												</div>
											) : !selectedJob.inputImageUrl ? (
												<div className="rounded-lg border border-border/70 bg-muted/55 p-3 text-xs text-muted-foreground">
													Missing input image for overlay rendering
												</div>
											) : (
												<div className="space-y-3">
													<div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/80">
														<Image
															src={selectedJob.inputImageUrl}
															alt="Input image with combined mask overlays"
															className="block w-full object-cover"
															width={500}
															height={500}
														/>
														{selectedJob.outputs.map((output, index) =>
															output.url ? (
																<div
																	key={`overlay-${output.maskIndex}`}
																	className="pointer-events-none absolute inset-0"
																	style={buildMaskTintStyle(
																		output.url,
																		MASK_OVERLAY_COLORS[
																			index % MASK_OVERLAY_COLORS.length
																		],
																	)}
																/>
															) : null,
														)}
													</div>
												</div>
											)}
										</section>
									)}
								</div>
							)}
						</div>

						<div className="sticky bottom-0 z-10 border-t border-border/70 bg-card/95 p-3 backdrop-blur-sm md:hidden">
							<Button
								onClick={closeJobDetail}
								className="w-full border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.12em] text-foreground hover:bg-primary/30"
							>
								<X className="size-3.5" aria-hidden />
								Close Detail
							</Button>
						</div>
					</aside>
				</div>
			) : null}
		</>
	);
}

export default function RequestsPage(props: RequestsPageContentProps) {
	return (
		<main className="mx-auto flex w-full max-w-330 flex-col gap-4 px-3 pb-8 pt-3 sm:gap-5 sm:px-6 sm:pb-10 sm:pt-4">
			<RequestsPageContent {...props} />
		</main>
	);
}
