'use client';

import {
	NetworkError,
	SegmentationApiError,
	SegmentationClient,
	type SegmentVideoRequest,
	UploadError,
} from '@segmentationapi/sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth-client';

import type {
	PlaygroundErrorState,
	PlaygroundMode,
	PlaygroundResult,
	PlaygroundStatus,
	PlaygroundVideoBox,
	PlaygroundVideoPoint,
	PlaygroundVideoPromptMode,
	PlaygroundVideoSamplingState,
	RunButtonState,
} from './playground-types';

function stringifyErrorBody(body: unknown) {
	if (!body) {
		return null;
	}

	if (typeof body === 'string') {
		return body;
	}

	try {
		return JSON.stringify(body);
	} catch {
		return String(body);
	}
}

function parsePlaygroundError(error: unknown): PlaygroundErrorState {
	if (error instanceof SegmentationApiError) {
		const details = [
			`Status: ${error.status}`,
			error.requestId ? `Request ID: ${error.requestId}` : null,
			stringifyErrorBody(error.body),
		].filter(Boolean) as string[];

		return {
			details,
			title: 'Segmentation API request failed',
		};
	}

	if (error instanceof UploadError) {
		const details = [
			`Status: ${error.status}`,
			`Upload URL: ${error.url}`,
			stringifyErrorBody(error.body),
		].filter(Boolean) as string[];

		return {
			details,
			title: 'File upload failed',
		};
	}

	if (error instanceof NetworkError) {
		const details = [
			typeof error.context === 'string'
				? error.context
				: JSON.stringify(error.context),
			error.cause instanceof Error
				? error.cause.message
				: String(error.cause ?? ''),
		].filter(Boolean) as string[];

		return {
			details,
			title: 'Network error',
		};
	}

	if (error instanceof Error) {
		return {
			details: [error.message],
			title: 'Unexpected error',
		};
	}

	return {
		details: ['Unknown failure while processing the playground request.'],
		title: 'Unexpected error',
	};
}

function parsePositiveNumber(value: string, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${fieldName} must be greater than 0`);
	}
	return parsed;
}

function parsePositiveInteger(value: string, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new Error(`${fieldName} must be an integer >= 1`);
	}
	return parsed;
}

function parseNonNegativeInteger(value: string, fieldName: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`${fieldName} must be an integer >= 0`);
	}
	return parsed;
}

const DEFAULT_VIDEO_SAMPLING: PlaygroundVideoSamplingState = {
	fps: '',
	maxFrames: '',
	mode: 'default',
	numFrames: '',
};

export function usePlaygroundSegmentation() {
	const [mode, setMode] = useState<PlaygroundMode>('image');
	const [prompts, setPrompts] = useState<string[]>(['']);
	const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
	const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
	const [videoSampling, setVideoSampling] = useState<PlaygroundVideoSamplingState>(
		DEFAULT_VIDEO_SAMPLING,
	);
	const [videoPromptMode, setVideoPromptMode] =
		useState<PlaygroundVideoPromptMode>('points');
	const [videoPoints, setVideoPoints] = useState<PlaygroundVideoPoint[]>([]);
	const [videoBoxes, setVideoBoxes] = useState<PlaygroundVideoBox[]>([]);
	const [videoFrameIdx, setVideoFrameIdx] = useState('0');
	const [videoClearOldInputs, setVideoClearOldInputs] = useState(true);

	const [status, setStatus] = useState<PlaygroundStatus>('idle');
	const [result, setResult] = useState<PlaygroundResult | null>(null);
	const [error, setError] = useState<PlaygroundErrorState | null>(null);

	const runAbortRef = useRef<AbortController | null>(null);
	const runAttemptRef = useRef(0);

	useEffect(() => {
		return () => {
			runAttemptRef.current += 1;
			runAbortRef.current?.abort();
		};
	}, []);

	const resetRunState = useCallback(() => {
		setError(null);
		setResult(null);
		setStatus('idle');
	}, []);

	const handleModeChange = useCallback(
		(nextMode: PlaygroundMode) => {
			runAttemptRef.current += 1;
			runAbortRef.current?.abort();
			setMode(nextMode);
			resetRunState();
		},
		[resetRunState],
	);

	const onImageFileSelected = useCallback(
		(file: File | null) => {
			runAttemptRef.current += 1;
			runAbortRef.current?.abort();
			setSelectedImageFile(file);
			resetRunState();
		},
		[resetRunState],
	);

	const onVideoFileSelected = useCallback(
		(file: File | null) => {
			runAttemptRef.current += 1;
			runAbortRef.current?.abort();
			setSelectedVideoFile(file);
			resetRunState();
		},
		[resetRunState],
	);

	const onPromptsChange = useCallback(
		(value: string[]) => {
			setPrompts(value);
			setResult(null);
			setError(null);
			if (status !== 'running') {
				setStatus('idle');
			}
		},
		[status],
	);

	const onVideoSamplingChange = useCallback(
		(next: Partial<PlaygroundVideoSamplingState>) => {
			setVideoSampling((current) => ({ ...current, ...next }));
			setResult(null);
			setError(null);
		},
		[],
	);

	const onVideoPromptModeChange = useCallback((nextMode: PlaygroundVideoPromptMode) => {
		setVideoPromptMode(nextMode);
		setResult(null);
		setError(null);
	}, []);

	const onVideoPointCaptured = useCallback((point: { x: number; y: number }) => {
		setVideoPoints((current) => [
			...current,
			{
				label: 1,
				objectId: String(current.length + 1),
				x: point.x,
				y: point.y,
			},
		]);
		setResult(null);
		setError(null);
	}, []);

	const onVideoBoxCaptured = useCallback(
		(box: { x1: number; x2: number; y1: number; y2: number }) => {
			setVideoBoxes((current) => [
				...current,
				{
					objectId: String(current.length + 1),
					x1: box.x1,
					x2: box.x2,
					y1: box.y1,
					y2: box.y2,
				},
			]);
			setResult(null);
			setError(null);
		},
		[],
	);

	const onVideoPointUpdated = useCallback(
		(index: number, updates: Partial<Pick<PlaygroundVideoPoint, 'label' | 'objectId'>>) => {
			setVideoPoints((current) =>
				current.map((item, itemIndex) =>
					itemIndex === index ? { ...item, ...updates } : item,
				),
			);
			setResult(null);
			setError(null);
		},
		[],
	);

	const onVideoBoxUpdated = useCallback(
		(index: number, updates: Partial<Pick<PlaygroundVideoBox, 'objectId'>>) => {
			setVideoBoxes((current) =>
				current.map((item, itemIndex) =>
					itemIndex === index ? { ...item, ...updates } : item,
				),
			);
			setResult(null);
			setError(null);
		},
		[],
	);

	const onVideoPointRemoved = useCallback((index: number) => {
		setVideoPoints((current) => current.filter((_, itemIndex) => itemIndex !== index));
		setResult(null);
		setError(null);
	}, []);

	const onVideoBoxRemoved = useCallback((index: number) => {
		setVideoBoxes((current) => current.filter((_, itemIndex) => itemIndex !== index));
		setResult(null);
		setError(null);
	}, []);

	const onClearVideoAnnotations = useCallback(() => {
		setVideoPoints([]);
		setVideoBoxes([]);
		setResult(null);
		setError(null);
	}, []);

	const onRunRequested = useCallback(async () => {
		if (status === 'running') {
			return;
		}

		const runAttempt = ++runAttemptRef.current;
		runAbortRef.current?.abort();
		const abortController = new AbortController();
		runAbortRef.current = abortController;

		setStatus('running');
		setError(null);

		try {
			const { data: tokenData, error: tokenError } = await authClient.token();
			if (tokenError || !tokenData) {
				throw new Error(tokenError?.message ?? 'Could not retrieve JWT token.');
			}

			const client = new SegmentationClient({
				jwt: tokenData.token,
			});

			if (mode === 'image') {
				const trimmedPrompts = prompts.map((value) => value.trim()).filter(Boolean);
				if (trimmedPrompts.length === 0) {
					throw new Error('At least one prompt is required');
				}
				if (!selectedImageFile) {
					throw new Error('Upload an image to continue');
				}
				if (
					selectedImageFile.type &&
					!selectedImageFile.type.startsWith('image/')
				) {
					throw new Error('Only image files are supported in image mode');
				}

				const contentType = selectedImageFile.type || 'image/png';
				const imageResponse = await client.uploadAndSegment({
					prompts: trimmedPrompts,
					data: selectedImageFile,
					contentType,
					threshold: 0.5,
					maskThreshold: 0.5,
					signal: abortController.signal,
				});

				if (
					runAttemptRef.current !== runAttempt ||
					abortController.signal.aborted
				) {
					return;
				}

				setResult({
					mode: 'image',
					previewMasks: imageResponse.masks.map((mask) => ({ url: mask.url })),
					raw: imageResponse,
					summary: `Completed with ${imageResponse.masks.length} mask${imageResponse.masks.length === 1 ? '' : 's'}.`,
				});
				setStatus('ready');
				toast.success('Segmentation completed');
				return;
			}

			if (!selectedVideoFile) {
				throw new Error('Upload a video to continue');
			}
			if (
				selectedVideoFile.type &&
				!selectedVideoFile.type.startsWith('video/')
			) {
				throw new Error('Only video files are supported in video mode');
			}

			if (videoPromptMode === 'points' && videoPoints.length === 0) {
				throw new Error('Add at least one point in the preview to continue');
			}
			if (videoPromptMode === 'boxes' && videoBoxes.length === 0) {
				throw new Error('Draw at least one box in the preview to continue');
			}

			const frameIdx = parseNonNegativeInteger(videoFrameIdx || '0', 'Frame index');
			const maxFrames = videoSampling.maxFrames.trim()
				? parsePositiveInteger(videoSampling.maxFrames, 'Max frames')
				: undefined;

			const samplingPayload =
				videoSampling.mode === 'fps'
					? { fps: parsePositiveNumber(videoSampling.fps, 'FPS') }
					: videoSampling.mode === 'numFrames'
						? {
								numFrames: parsePositiveInteger(
									videoSampling.numFrames,
									'Num frames',
								),
							}
						: {};

			const basePayload = {
				clearOldInputs: videoClearOldInputs,
				file: selectedVideoFile,
				frameIdx,
				signal: abortController.signal,
				...(maxFrames !== undefined ? { maxFrames } : {}),
			};

			const requestPayload: SegmentVideoRequest =
				videoPromptMode === 'points'
					? {
							...basePayload,
							...samplingPayload,
							pointLabels: videoPoints.map((point) => point.label),
							pointObjectIds: videoPoints.map((point, index) =>
								point.objectId.trim() || String(index + 1),
							),
							points: videoPoints.map(
								(point): [number, number] => [point.x, point.y],
							),
						}
					: {
							...basePayload,
							...samplingPayload,
							boxObjectIds: videoBoxes.map((box, index) =>
								box.objectId.trim() || String(index + 1),
							),
							boxes: videoBoxes.map(
								(box): [number, number, number, number] => [
									box.x1,
									box.y1,
									box.x2,
									box.y2,
								],
							),
						};

			const videoResponse = await client.segmentVideo(requestPayload);

			if (
				runAttemptRef.current !== runAttempt ||
				abortController.signal.aborted
			) {
				return;
			}

			setResult({
				mode: 'video',
				raw: videoResponse,
				summary: `Processed ${videoResponse.counts.framesProcessed} frames with ${videoResponse.counts.totalMasks} total masks.`,
			});
			setStatus('ready');
			toast.success('Video segmentation completed');
		} catch (runError) {
			if (
				runAttemptRef.current !== runAttempt ||
				abortController.signal.aborted
			) {
				return;
			}

			const parsedError = parsePlaygroundError(runError);
			setError(parsedError);
			setStatus('idle');
			toast.error(parsedError.title);
		}
	}, [
		mode,
		prompts,
		selectedImageFile,
		selectedVideoFile,
		status,
		videoBoxes,
		videoClearOldInputs,
		videoFrameIdx,
		videoPoints,
		videoPromptMode,
		videoSampling,
	]);

	const runButtonState: RunButtonState =
		status === 'running' ? 'running' : 'default';

	const statusMessage = useMemo(() => {
		if (status === 'running') {
			return mode === 'video'
				? 'Running video segmentation...'
				: 'Running segmentation...';
		}
		if (result) {
			return result.summary;
		}
		if (mode === 'image' && selectedImageFile) {
			return `${selectedImageFile.name} selected.`;
		}
		if (mode === 'video' && selectedVideoFile) {
			return `${selectedVideoFile.name} selected.`;
		}
		return null;
	}, [mode, result, selectedImageFile, selectedVideoFile, status]);

	return {
		error,
		handleModeChange,
		mode,
		onClearVideoAnnotations,
		onImageFileSelected,
		onPromptsChange,
		onRunRequested,
		onVideoBoxCaptured,
		onVideoBoxRemoved,
		onVideoBoxUpdated,
		onVideoFileSelected,
		onVideoPointCaptured,
		onVideoPointRemoved,
		onVideoPointUpdated,
		onVideoPromptModeChange,
		onVideoSamplingChange,
		prompts,
		result,
		runButtonState,
		selectedImageFile,
		selectedVideoFile,
		setVideoClearOldInputs,
		setVideoFrameIdx,
		statusMessage,
		videoBoxes,
		videoClearOldInputs,
		videoFrameIdx,
		videoPoints,
		videoPromptMode,
		videoSampling,
	};
}
