import type { MouseEvent, PointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
	PlaygroundMaskPreview,
	PlaygroundMode,
	PlaygroundVideoBox,
	PlaygroundVideoPoint,
	PlaygroundVideoPromptMode,
} from './playground-types';

const MASK_OVERLAY_COLORS = ['#ff703f', '#39d5c9', '#f2b77a', '#74e8a5', '#f95f8e', '#ffeecc'];

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

type PlaygroundPreviewProps = {
	hasResult: boolean;
	masks: PlaygroundMaskPreview[];
	mode: PlaygroundMode;
	onVideoBoxCaptured: (box: {
		x1: number;
		x2: number;
		y1: number;
		y2: number;
	}) => void;
	onVideoPointCaptured: (point: { x: number; y: number }) => void;
	selectedImageFile: File | null;
	selectedVideoFile: File | null;
	videoBoxes: PlaygroundVideoBox[];
	videoPoints: PlaygroundVideoPoint[];
	videoPromptMode: PlaygroundVideoPromptMode;
};

type Dimensions = {
	height: number;
	width: number;
};

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function PlaygroundPreview({
	hasResult,
	masks,
	mode,
	onVideoBoxCaptured,
	onVideoPointCaptured,
	selectedImageFile,
	selectedVideoFile,
	videoBoxes,
	videoPoints,
	videoPromptMode,
}: PlaygroundPreviewProps) {
	const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
	const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
	const [videoDimensions, setVideoDimensions] = useState<Dimensions>({
		height: 0,
		width: 0,
	});
	const [canvasRevision, setCanvasRevision] = useState(0);
	const [draftBox, setDraftBox] = useState<{
		x1: number;
		x2: number;
		y1: number;
		y2: number;
	} | null>(null);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
	const boxStartPointRef = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		if (!selectedImageFile) {
			setImagePreviewUrl(null);
			return;
		}

		const objectUrl = URL.createObjectURL(selectedImageFile);
		setImagePreviewUrl(objectUrl);

		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	}, [selectedImageFile]);

	useEffect(() => {
		if (!selectedVideoFile) {
			setVideoPreviewUrl(null);
			setVideoDimensions({ height: 0, width: 0 });
			return;
		}

		const objectUrl = URL.createObjectURL(selectedVideoFile);
		setVideoPreviewUrl(objectUrl);

		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	}, [selectedVideoFile]);

	const syncCanvasSize = useCallback(() => {
		const wrapper = canvasWrapperRef.current;
		const canvas = canvasRef.current;
		if (!wrapper || !canvas) {
			return;
		}

		const rect = wrapper.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return;
		}

		canvas.width = rect.width;
		canvas.height = rect.height;
		setCanvasRevision((value) => value + 1);
	}, []);

	useEffect(() => {
		if (mode !== 'video') {
			return;
		}

		syncCanvasSize();
		window.addEventListener('resize', syncCanvasSize);
		return () => {
			window.removeEventListener('resize', syncCanvasSize);
		};
	}, [mode, syncCanvasSize, videoPreviewUrl]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || mode !== 'video') {
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		const scaleX = canvas.width / (videoDimensions.width || canvas.width || 1);
		const scaleY = canvas.height / (videoDimensions.height || canvas.height || 1);

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		videoBoxes.forEach((box) => {
			const x = Math.min(box.x1, box.x2) * scaleX;
			const y = Math.min(box.y1, box.y2) * scaleY;
			const width = Math.abs(box.x2 - box.x1) * scaleX;
			const height = Math.abs(box.y2 - box.y1) * scaleY;

			ctx.strokeStyle = '#39d5c9';
			ctx.lineWidth = 2;
			ctx.strokeRect(x, y, width, height);
		});

		videoPoints.forEach((point) => {
			const x = point.x * scaleX;
			const y = point.y * scaleY;

			ctx.beginPath();
			ctx.arc(x, y, 5, 0, Math.PI * 2);
			ctx.fillStyle = point.label > 0 ? '#74e8a5' : '#f95f8e';
			ctx.fill();
			ctx.lineWidth = 1;
			ctx.strokeStyle = '#0e1518';
			ctx.stroke();
		});

		if (draftBox) {
			const x = Math.min(draftBox.x1, draftBox.x2) * scaleX;
			const y = Math.min(draftBox.y1, draftBox.y2) * scaleY;
			const width = Math.abs(draftBox.x2 - draftBox.x1) * scaleX;
			const height = Math.abs(draftBox.y2 - draftBox.y1) * scaleY;

			ctx.strokeStyle = '#f2b77a';
			ctx.lineWidth = 2;
			ctx.setLineDash([6, 4]);
			ctx.strokeRect(x, y, width, height);
			ctx.setLineDash([]);
		}
	}, [
		canvasRevision,
		draftBox,
		mode,
		videoBoxes,
		videoDimensions.height,
		videoDimensions.width,
		videoPoints,
	]);

	const toNaturalCoordinates = useCallback(
		(event: PointerEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return null;
			}

			const rect = canvas.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) {
				return null;
			}

			const xInCanvas = clamp(event.clientX - rect.left, 0, rect.width);
			const yInCanvas = clamp(event.clientY - rect.top, 0, rect.height);

			const naturalWidth = videoDimensions.width || rect.width;
			const naturalHeight = videoDimensions.height || rect.height;

			return {
				x: (xInCanvas / rect.width) * naturalWidth,
				y: (yInCanvas / rect.height) * naturalHeight,
			};
		},
		[videoDimensions.height, videoDimensions.width],
	);

	const handleCanvasPointerDown = useCallback(
		(event: PointerEvent<HTMLCanvasElement>) => {
			if (videoPromptMode !== 'boxes') {
				return;
			}

			const startPoint = toNaturalCoordinates(event);
			if (!startPoint) {
				return;
			}

			boxStartPointRef.current = startPoint;
			setDraftBox({
				x1: startPoint.x,
				x2: startPoint.x,
				y1: startPoint.y,
				y2: startPoint.y,
			});
		},
		[toNaturalCoordinates, videoPromptMode],
	);

	const handleCanvasPointerMove = useCallback(
		(event: PointerEvent<HTMLCanvasElement>) => {
			if (videoPromptMode !== 'boxes' || !boxStartPointRef.current) {
				return;
			}

			const point = toNaturalCoordinates(event);
			if (!point) {
				return;
			}

			setDraftBox({
				x1: boxStartPointRef.current.x,
				x2: point.x,
				y1: boxStartPointRef.current.y,
				y2: point.y,
			});
		},
		[toNaturalCoordinates, videoPromptMode],
	);

	const handleCanvasPointerUp = useCallback(
		(event: PointerEvent<HTMLCanvasElement>) => {
			if (videoPromptMode !== 'boxes' || !boxStartPointRef.current) {
				return;
			}

			const endPoint = toNaturalCoordinates(event);
			if (!endPoint) {
				boxStartPointRef.current = null;
				setDraftBox(null);
				return;
			}

			const nextBox = {
				x1: Math.min(boxStartPointRef.current.x, endPoint.x),
				x2: Math.max(boxStartPointRef.current.x, endPoint.x),
				y1: Math.min(boxStartPointRef.current.y, endPoint.y),
				y2: Math.max(boxStartPointRef.current.y, endPoint.y),
			};

			if (Math.abs(nextBox.x2 - nextBox.x1) > 2 && Math.abs(nextBox.y2 - nextBox.y1) > 2) {
				onVideoBoxCaptured(nextBox);
			}

			boxStartPointRef.current = null;
			setDraftBox(null);
		},
		[onVideoBoxCaptured, toNaturalCoordinates, videoPromptMode],
	);

	const handleCanvasClick = useCallback(
		(event: MouseEvent<HTMLCanvasElement>) => {
			if (videoPromptMode !== 'points') {
				return;
			}

			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) {
				return;
			}

			const xInCanvas = clamp(event.clientX - rect.left, 0, rect.width);
			const yInCanvas = clamp(event.clientY - rect.top, 0, rect.height);
			const naturalWidth = videoDimensions.width || rect.width;
			const naturalHeight = videoDimensions.height || rect.height;

			onVideoPointCaptured({
				x: (xInCanvas / rect.width) * naturalWidth,
				y: (yInCanvas / rect.height) * naturalHeight,
			});
		},
		[onVideoPointCaptured, videoDimensions.height, videoDimensions.width, videoPromptMode],
	);

	if (mode === 'video') {
		return (
			<div className="space-y-3 rounded-xl border border-border/70 bg-muted/45 p-3">
				<p className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
					Video Preview + Annotation Canvas
				</p>
				<div
					ref={canvasWrapperRef}
					className="relative overflow-hidden rounded-xl border border-border/70 bg-background/75"
				>
					{videoPreviewUrl ? (
						<>
							<video
								ref={videoRef}
								src={videoPreviewUrl}
								onLoadedMetadata={(event) => {
									setVideoDimensions({
										height: event.currentTarget.videoHeight || 0,
										width: event.currentTarget.videoWidth || 0,
									});
									syncCanvasSize();
								}}
								className="block w-full object-cover"
							/>
							<canvas
								ref={canvasRef}
								onClick={handleCanvasClick}
								onPointerDown={handleCanvasPointerDown}
								onPointerMove={handleCanvasPointerMove}
								onPointerUp={handleCanvasPointerUp}
								className="absolute inset-0 h-full w-full cursor-crosshair"
							/>
						</>
					) : (
						<div className="grid min-h-52 place-items-center px-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
							Select a video to preview and annotate.
						</div>
					)}
				</div>
				<p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
					{videoPromptMode === 'points'
						? 'Click on the canvas to add points.'
						: 'Drag on the canvas to draw boxes.'}
				</p>
				{hasResult ? (
					<p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
						Video request completed. Check summary for counts and links.
					</p>
				) : null}
			</div>
		);
	}

	return (
		<div className="space-y-3 rounded-xl border border-border/70 bg-muted/45 p-3">
			<p className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
				Input + Combined Masks
			</p>
			<div className="relative overflow-hidden rounded-xl border border-border/70 bg-background/75">
				{imagePreviewUrl ? (
					<>
						<img
							src={imagePreviewUrl}
							alt="Selected input with combined mask overlays"
							className="block w-full object-cover"
						/>
						{masks.map((mask, index) =>
							mask.url ? (
								<div
									key={`playground-overlay-${mask.url}-${index}`}
									className="pointer-events-none absolute inset-0"
									style={buildMaskTintStyle(
										mask.url,
										MASK_OVERLAY_COLORS[index % MASK_OVERLAY_COLORS.length],
									)}
								/>
							) : null,
						)}
					</>
				) : (
					<div className="grid min-h-52 place-items-center px-4 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
						Select an image to preview it here.
					</div>
				)}
			</div>
			{imagePreviewUrl && hasResult ? (
				<p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
					Combined from {masks.length} returned mask{masks.length === 1 ? '' : 'es'}.
				</p>
			) : null}
		</div>
	);
}
