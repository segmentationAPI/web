'use client';

import { useEffect, useRef, useState } from 'react';

export function VideoDemo() {
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.3 },
		);

		if (containerRef.current) observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (visible && videoRef.current) {
			videoRef.current.play().catch(() => {});
		}
	}, [visible]);

	return (
		<div
			ref={containerRef}
			className="reveal space-y-3 rounded-[1.6rem] border border-border/70 bg-[#090b10]/60 p-3 sm:p-4"
		>
			<div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
				<span>Video Demo</span>
				<span className="inline-flex items-center gap-2 text-foreground">
					<span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_14px_rgba(57,213,201,0.95)]" />
					live
				</span>
			</div>

			<div className="relative overflow-hidden rounded-[1.4rem] border border-border/70 bg-[#090b10]">
				<video
					ref={videoRef}
					src="/spider-man.mp4"
					muted
					loop
					playsInline
					preload="metadata"
					className="aspect-video w-full object-cover"
				/>
			</div>

			<div className="rounded-lg border border-border/70 bg-background/85 p-3">
				<div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
					<span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
						prompt:
					</span>
					<span className="font-mono text-[11px] text-foreground">
						spider-man
					</span>
				</div>
			</div>
		</div>
	);
}
