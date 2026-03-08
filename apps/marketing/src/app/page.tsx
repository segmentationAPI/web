import Link from 'next/link';

import { env } from '@segmentation/env/marketing';
import { ArrowRight } from 'lucide-react';

import { LiveDemo } from './live-demo';
import { VideoDemo } from './video-demo';

export default function HomePage() {
	return (
		<main className="mx-auto flex w-full max-w-300 flex-col gap-20 px-4 pb-24 pt-8 sm:gap-28 sm:px-8 lg:gap-36">
		<section className="grid gap-8 sm:gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
			<div className="space-y-8 reveal" style={{ animationDelay: '120ms' }}>
				<div className="space-y-5">
					<h1 className="font-display text-[1.75rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
							Ship pixel-perfect segmentation at machine speed.
						</h1>
						<p className="max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
							One API for auto-labelling, annotation tools, and video
							segmentation — powered by Meta&apos;s Segment Anything Model 3.
						</p>
					</div>

					<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
						<a
							href={env.NEXT_PUBLIC_APP_URL}
							className="cta-primary w-full sm:w-auto"
						>
							Start Building
							<ArrowRight className="h-4 w-4" />
						</a>
						<Link href="/docs" className="cta-ghost w-full sm:w-auto">
							View Docs
						</Link>
					</div>

					<div className="grid grid-cols-3 gap-2 sm:gap-3">
						<article className="metric-card">
							<p className="metric-value">500ms</p>
							<p className="metric-label">per image</p>
						</article>
						<article className="metric-card">
							<p className="metric-value">2.4B+</p>
							<p className="metric-label">masks generated</p>
						</article>
						<article className="metric-card">
							<p className="metric-value">99.99%</p>
							<p className="metric-label">uptime SLA</p>
						</article>
					</div>
				</div>

			<LiveDemo />
			</section>

			<section className="reveal mx-auto flex w-full max-w-4xl flex-col items-center gap-10">
				<div className="space-y-4 text-center">
					<div className="tone-chip mx-auto">
						<span className="h-1.5 w-1.5 rounded-full bg-secondary" />
						Video Segmentation
					</div>
				<h2 className="font-display text-2xl tracking-tight sm:text-3xl md:text-5xl">
					Frame-by-frame,{' '}
					<span className="signal-text">fully automatic.</span>
				</h2>
					<p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
						Track and segment objects across every frame of a video
						with a single text prompt — no manual annotation required.
					</p>
				</div>
				<VideoDemo />
			</section>

			<section className="glass-panel reveal rounded-2xl p-6 text-center sm:rounded-[2rem] sm:p-14">
			<h2 className="font-display text-2xl sm:text-3xl md:text-5xl">
				Plug in once. Segment anything everywhere.
			</h2>
				<p className="mx-auto mt-4 max-w-xl text-muted-foreground">
					Launch your first request in minutes and skip the GPU ops burden
					entirely.
				</p>
				<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
					<a
						href={env.NEXT_PUBLIC_APP_URL}
						className="cta-primary w-full sm:w-auto"
					>
						Create Account
						<ArrowRight className="h-4 w-4" />
					</a>
					<Link href="/docs" className="cta-ghost w-full sm:w-auto">
						Explore Docs
					</Link>
				</div>
			</section>
		</main>
	);
}
