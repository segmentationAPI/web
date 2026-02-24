import { Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type {
	PlaygroundMode,
	PlaygroundVideoBox,
	PlaygroundVideoPoint,
	PlaygroundVideoPromptMode,
	PlaygroundVideoSamplingState,
	RunButtonState,
} from './playground-types';

type PlaygroundFormProps = {
	mode: PlaygroundMode;
	onClearVideoAnnotations: () => void;
	onImageFileSelected: (file: File | null) => void;
	onModeChange: (mode: PlaygroundMode) => void;
	onPromptsChange: (value: string[]) => void;
	onRunRequested: () => void;
	onVideoBoxRemoved: (index: number) => void;
	onVideoBoxUpdated: (
		index: number,
		updates: Partial<Pick<PlaygroundVideoBox, 'objectId'>>,
	) => void;
	onVideoFileSelected: (file: File | null) => void;
	onVideoPointRemoved: (index: number) => void;
	onVideoPointUpdated: (
		index: number,
		updates: Partial<Pick<PlaygroundVideoPoint, 'label' | 'objectId'>>,
	) => void;
	onVideoPromptModeChange: (mode: PlaygroundVideoPromptMode) => void;
	onVideoSamplingChange: (value: Partial<PlaygroundVideoSamplingState>) => void;
	prompts: string[];
	runButtonState: RunButtonState;
	statusMessage: string | null;
	videoBoxes: PlaygroundVideoBox[];
	videoClearOldInputs: boolean;
	videoFrameIdx: string;
	videoPoints: PlaygroundVideoPoint[];
	videoPromptMode: PlaygroundVideoPromptMode;
	videoSampling: PlaygroundVideoSamplingState;
	setVideoClearOldInputs: (value: boolean) => void;
	setVideoFrameIdx: (value: string) => void;
};

function ModeToggle({
	mode,
	onModeChange,
}: {
	mode: PlaygroundMode;
	onModeChange: (mode: PlaygroundMode) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-1 rounded-lg border border-border/70 bg-background/60 p-1">
			<button
				type="button"
				onClick={() => onModeChange('image')}
				className={`rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
					mode === 'image'
						? 'bg-primary/30 text-foreground'
						: 'text-muted-foreground hover:text-foreground'
				}`}
			>
				Image
			</button>
			<button
				type="button"
				onClick={() => onModeChange('video')}
				className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
					mode === 'video'
						? 'bg-primary/30 text-foreground'
						: 'text-muted-foreground hover:text-foreground'
				}`}
			>
				Video
			</button>
		</div>
	);
}

export function PlaygroundForm({
	mode,
	onClearVideoAnnotations,
	onImageFileSelected,
	onModeChange,
	onPromptsChange,
	onRunRequested,
	onVideoBoxRemoved,
	onVideoBoxUpdated,
	onVideoFileSelected,
	onVideoPointRemoved,
	onVideoPointUpdated,
	onVideoPromptModeChange,
	onVideoSamplingChange,
	prompts,
	runButtonState,
	statusMessage,
	videoBoxes,
	videoClearOldInputs,
	videoFrameIdx,
	videoPoints,
	videoPromptMode,
	videoSampling,
	setVideoClearOldInputs,
	setVideoFrameIdx,
}: PlaygroundFormProps) {
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				onRunRequested();
			}}
			className="space-y-3 rounded-xl border border-border/70 bg-muted/45 p-3"
		>
			<div className="space-y-1.5">
				<label className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
					Mode
				</label>
				<ModeToggle mode={mode} onModeChange={onModeChange} />
			</div>

			{mode === 'image' ? (
				<>
					<div className="space-y-1.5">
						<label className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
							Prompts
						</label>
						<div className="flex flex-col gap-2">
							{prompts.map((prompt, index) => (
								<div key={`${index}-${prompt}`} className="flex items-center gap-2">
									<input
										value={prompt}
										onChange={(event) => {
											const next = [...prompts];
											next[index] = event.target.value;
											onPromptsChange(next);
										}}
										placeholder="object to segment (e.g. red shoe, person, tree)"
										className="w-full border border-input bg-background/65 px-2.5 py-2 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
									/>
									{prompts.length > 1 ? (
										<button
											type="button"
											onClick={() =>
												onPromptsChange(
													prompts.filter((_, itemIndex) => itemIndex !== index),
												)
											}
											className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-destructive"
										>
											<X className="size-3.5" />
										</button>
									) : null}
								</div>
							))}
							<button
								type="button"
								onClick={() => onPromptsChange([...prompts, ''])}
								className="flex items-center gap-1.5 self-start font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
							>
								<Plus className="size-3" />
								Add Prompt
							</button>
						</div>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="playground-image"
							className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground"
						>
							Image
						</label>
						<Input
							id="playground-image"
							type="file"
							accept="image/*"
							onChange={(event) => onImageFileSelected(event.target.files?.[0] ?? null)}
							className="h-10 cursor-pointer border-input bg-background/65 file:mr-2 file:rounded-sm file:border file:border-input file:bg-muted/60 file:px-2.5"
						/>
						<p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
							Threshold and maskThreshold are fixed to 0.5 for this playground.
						</p>
					</div>
				</>
			) : (
				<>
					<div className="space-y-1.5">
						<label
							htmlFor="playground-video"
							className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground"
						>
							Video
						</label>
						<Input
							id="playground-video"
							type="file"
							accept="video/*"
							onChange={(event) => onVideoFileSelected(event.target.files?.[0] ?? null)}
							className="h-10 cursor-pointer border-input bg-background/65 file:mr-2 file:rounded-sm file:border file:border-input file:bg-muted/60 file:px-2.5"
						/>
					</div>

					<div className="space-y-2 rounded-lg border border-border/70 bg-background/55 p-2.5">
						<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							Sampling
						</p>
						<div className="grid grid-cols-3 gap-1">
							{(['default', 'fps', 'numFrames'] as const).map((samplingMode) => (
								<button
									key={samplingMode}
									type="button"
									onClick={() => onVideoSamplingChange({ mode: samplingMode })}
									className={`rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
										videoSampling.mode === samplingMode
											? 'bg-primary/30 text-foreground'
											: 'text-muted-foreground hover:text-foreground'
									}`}
								>
									{samplingMode === 'numFrames' ? 'num_frames' : samplingMode}
								</button>
							))}
						</div>
						{videoSampling.mode === 'fps' ? (
							<Input
								type="number"
								step="0.1"
								min="0"
								value={videoSampling.fps}
								onChange={(event) => onVideoSamplingChange({ fps: event.target.value })}
								placeholder="fps"
								className="h-9 border-input bg-background/70 text-xs"
							/>
						) : null}
						{videoSampling.mode === 'numFrames' ? (
							<Input
								type="number"
								step="1"
								min="1"
								value={videoSampling.numFrames}
								onChange={(event) =>
									onVideoSamplingChange({ numFrames: event.target.value })
								}
								placeholder="num_frames"
								className="h-9 border-input bg-background/70 text-xs"
							/>
						) : null}
						<Input
							type="number"
							step="1"
							min="1"
							value={videoSampling.maxFrames}
							onChange={(event) => onVideoSamplingChange({ maxFrames: event.target.value })}
							placeholder="max_frames (optional)"
							className="h-9 border-input bg-background/70 text-xs"
						/>
					</div>

					<div className="space-y-2 rounded-lg border border-border/70 bg-background/55 p-2.5">
						<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							Visual Prompt Mode
						</p>
						<div className="grid grid-cols-2 gap-1">
							<button
								type="button"
								onClick={() => onVideoPromptModeChange('points')}
								className={`rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
									videoPromptMode === 'points'
										? 'bg-primary/30 text-foreground'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								Points
							</button>
							<button
								type="button"
								onClick={() => onVideoPromptModeChange('boxes')}
								className={`rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
									videoPromptMode === 'boxes'
										? 'bg-primary/30 text-foreground'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								Boxes
							</button>
						</div>

						<div className="grid gap-2 sm:grid-cols-2">
							<Input
								type="number"
								step="1"
								min="0"
								value={videoFrameIdx}
								onChange={(event) => setVideoFrameIdx(event.target.value)}
								placeholder="frame_idx"
								className="h-9 border-input bg-background/70 text-xs"
							/>
							<label className="flex items-center gap-2 rounded-md border border-border/70 px-2 py-1.5 text-xs text-muted-foreground">
								<input
									type="checkbox"
									checked={videoClearOldInputs}
									onChange={(event) => setVideoClearOldInputs(event.target.checked)}
									className="size-3.5"
								/>
								clear_old_inputs
							</label>
						</div>

						<p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
							Use the preview canvas to click points or draw boxes.
						</p>
					</div>

					<div className="space-y-2 rounded-lg border border-border/70 bg-background/55 p-2.5">
						<div className="flex items-center justify-between gap-2">
							<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
								{videoPromptMode === 'points' ? 'Points' : 'Boxes'}
							</p>
							<Button
								type="button"
								variant="outline"
								onClick={onClearVideoAnnotations}
								className="h-7 border-border/70 px-2 font-mono text-[10px] uppercase tracking-[0.12em]"
							>
								<Trash2 className="size-3" />
								Clear
							</Button>
						</div>

						{videoPromptMode === 'points' ? (
							<div className="space-y-2">
								{videoPoints.length === 0 ? (
									<p className="text-xs text-muted-foreground">No points captured yet.</p>
								) : (
									videoPoints.map((point, index) => (
										<div
											key={`point-${index}`}
											className="grid gap-1.5 rounded-md border border-border/70 p-2 sm:grid-cols-[1fr_1fr_auto]"
										>
											<p className="text-[11px] text-muted-foreground">
												({point.x.toFixed(1)}, {point.y.toFixed(1)})
											</p>
											<Input
												type="number"
												step="1"
												value={point.label}
												onChange={(event) =>
													onVideoPointUpdated(index, {
														label: Number(event.target.value || 0),
													})
												}
												placeholder="label"
												className="h-8 border-input bg-background/70 text-xs"
											/>
											<div className="flex gap-1.5">
												<Input
													value={point.objectId}
													onChange={(event) =>
														onVideoPointUpdated(index, {
															objectId: event.target.value,
														})
													}
													placeholder="object id"
													className="h-8 border-input bg-background/70 text-xs"
												/>
												<button
													type="button"
													onClick={() => onVideoPointRemoved(index)}
													className="rounded-md border border-border/70 px-2 text-muted-foreground transition-colors hover:text-destructive"
												>
													<X className="size-3.5" />
												</button>
											</div>
										</div>
									))
								)}
							</div>
						) : (
							<div className="space-y-2">
								{videoBoxes.length === 0 ? (
									<p className="text-xs text-muted-foreground">No boxes captured yet.</p>
								) : (
									videoBoxes.map((box, index) => (
										<div
											key={`box-${index}`}
											className="grid gap-1.5 rounded-md border border-border/70 p-2 sm:grid-cols-[1fr_auto]"
										>
											<p className="text-[11px] text-muted-foreground">
												[{box.x1.toFixed(1)}, {box.y1.toFixed(1)}] → [{box.x2.toFixed(1)}, {box.y2.toFixed(1)}]
											</p>
											<div className="flex gap-1.5">
												<Input
													value={box.objectId}
													onChange={(event) =>
														onVideoBoxUpdated(index, {
															objectId: event.target.value,
														})
													}
													placeholder="object id"
													className="h-8 border-input bg-background/70 text-xs"
												/>
												<button
													type="button"
													onClick={() => onVideoBoxRemoved(index)}
													className="rounded-md border border-border/70 px-2 text-muted-foreground transition-colors hover:text-destructive"
												>
													<X className="size-3.5" />
												</button>
											</div>
										</div>
									))
								)}
							</div>
						)}
					</div>
				</>
			)}

			{statusMessage ? (
				<p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
					{statusMessage}
				</p>
			) : null}

			<Button
				type="submit"
				disabled={runButtonState === 'running'}
				className="w-full border border-primary/45 bg-primary/20 font-mono uppercase tracking-[0.14em] text-foreground hover:bg-primary/30"
			>
				{runButtonState === 'running' ? (
					<>
						<Loader2 className="size-3.5 animate-spin" aria-hidden />
						Running
					</>
				) : (
					<>
						<Sparkles className="size-3.5" aria-hidden />
						{mode === 'video' ? 'Run Video Segmentation' : 'Run Segmentation'}
					</>
				)}
			</Button>
		</form>
	);
}
