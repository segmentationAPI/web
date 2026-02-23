'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createProjectAction } from '../../actions';

export function ProjectSetup() {
	const router = useRouter();
	const [name, setName] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) {
			setError('Project name is required.');
			return;
		}
		setError(null);
		setIsSubmitting(true);

		try {
			const res = await createProjectAction({ name });
			if (!res.ok) {
				setError(res.error || 'Failed to create project.');
				setIsSubmitting(false);
				return;
			}
			router.push(`/auto-label/${res.projectId}`);
		} catch {
			setError('An unexpected error occurred.');
			setIsSubmitting(false);
		}
	}

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-10">
			<div className="glass-panel rounded-[1.35rem] border-border/70 bg-card/75 p-8">
				<form
					onSubmit={handleSubmit}
					autoComplete="off"
					className="flex flex-col gap-6"
				>
					<div className="space-y-1.5">
						<h2 className="font-display text-xl tracking-[0.03em] text-foreground">
							Create a new project
						</h2>
						<p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
							Give your project a name to get started
						</p>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor="project-name"
							className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
						>
							Project name
						</Label>
						<Input
							id="project-name"
							placeholder="e.g. Medical Cell Segmentation"
							value={name}
							onChange={e => setName(e.target.value)}
							className="h-10 rounded-lg border-border/60 bg-background/60 px-3 text-sm focus-visible:border-primary/60"
							autoFocus
							autoComplete="off"
							disabled={isSubmitting}
						/>
					</div>

					{error && (
						<p className="font-mono text-[11px] text-destructive">{error}</p>
					)}

					<div className="flex items-center gap-3 pt-2">
						<Button
							type="submit"
							disabled={isSubmitting}
							className="gap-2 rounded-xl border border-primary/50 bg-primary/20 font-mono text-[11px] uppercase tracking-[0.14em] text-primary hover:bg-primary/30 disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="size-3.5 animate-spin" /> Creating...
								</>
							) : (
								<>
									Create Project <ArrowRight className="size-3.5" />
								</>
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
