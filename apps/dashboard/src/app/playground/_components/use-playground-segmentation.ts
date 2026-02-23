'use client';

import {
	NetworkError,
	SegmentationApiError,
	SegmentationClient,
	UploadError,
} from '@segmentationapi/sdk';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth-client';

import type {
	PlaygroundErrorState,
	PlaygroundResult,
	PlaygroundStatus,
	RunButtonState,
} from './playground-types';

type PlaygroundState = {
	prompts: string[];
	selectedFile: File | null;
	status: PlaygroundStatus;
	result: PlaygroundResult | null;
	error: PlaygroundErrorState | null;
};

type PlaygroundAction =
	| { type: 'prompts:set'; value: string[] }
	| { type: 'file:set'; file: File | null }
	| { type: 'run:start' }
	| { type: 'run:success'; result: PlaygroundResult }
	| { type: 'run:error'; error: PlaygroundErrorState };

const initialPlaygroundState: PlaygroundState = {
	error: null,
	prompts: [''],
	result: null,
	selectedFile: null,
	status: 'idle',
};

function playgroundReducer(
	state: PlaygroundState,
	action: PlaygroundAction,
): PlaygroundState {
	switch (action.type) {
		case 'prompts:set':
			return {
				...state,
				prompts: action.value,
			};
		case 'file:set':
			return {
				...state,
				error: null,
				result: null,
				selectedFile: action.file,
				status: 'idle',
			};
		case 'run:start':
			return {
				...state,
				error: null,
				status: 'running',
			};
		case 'run:success':
			return {
				...state,
				result: action.result,
				status: 'ready',
			};
		case 'run:error':
			return {
				...state,
				error: action.error,
				status: 'idle',
			};
	}
}

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
			title: 'Image upload failed',
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

export function usePlaygroundSegmentation() {
	const [state, dispatch] = useReducer(
		playgroundReducer,
		initialPlaygroundState,
	);
	const runAbortRef = useRef<AbortController | null>(null);
	const runAttemptRef = useRef(0);
	const stateRef = useRef(state);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		return () => {
			runAttemptRef.current += 1;
			runAbortRef.current?.abort();
		};
	}, []);

	const setPrompts = useCallback((value: string[]) => {
		dispatch({ type: 'prompts:set', value });
	}, []);

	const onFileSelected = useCallback((file: File | null) => {
		runAttemptRef.current += 1;
		runAbortRef.current?.abort();
		dispatch({ type: 'file:set', file });
	}, []);

	const onRunRequested = useCallback(async () => {
		const currentState = stateRef.current;
		const trimmedPrompts = currentState.prompts.map(p => p.trim()).filter(Boolean);

		if (currentState.status === 'running') {
			return;
		}

		if (trimmedPrompts.length === 0) {
			toast.error('At least one prompt is required');
			return;
		}

		if (!currentState.selectedFile) {
			toast.error('Upload an image to continue');
			return;
		}

		const file = currentState.selectedFile;
		if (file.type && !file.type.startsWith('image/')) {
			toast.error('Only image files are supported');
			return;
		}

		const runAttempt = ++runAttemptRef.current;
		runAbortRef.current?.abort();
		const abortController = new AbortController();
		runAbortRef.current = abortController;
		dispatch({ type: 'run:start' });

		try {
			const { data: tokenData, error: tokenError } = await authClient.token();
			if (tokenError || !tokenData) {
				toast.error('Failed to retrieve authentication token');
				dispatch({
					type: 'run:error',
					error: {
						title: 'Authentication failed',
						details: [tokenError?.message ?? 'Could not retrieve JWT token.'],
					},
				});
				return;
			}
			const jwtToken = tokenData.token;

			const client = new SegmentationClient({
				jwt: jwtToken,
			});

			const contentType = file.type || 'image/png';
			const response = await client.uploadAndSegment({
				prompts: trimmedPrompts,
				data: file,
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

			dispatch({
				type: 'run:success',
				result: {
					raw: response,
					previewFileIndex: 0,
					previewMasks: response.masks.map(mask => ({ url: mask.url })),
					summary: `Completed with ${response.masks.length} mask${response.masks.length === 1 ? '' : 's'}.`,
				},
			});
			toast.success('Segmentation completed');
		} catch (error) {
			if (
				runAttemptRef.current !== runAttempt ||
				abortController.signal.aborted
			) {
				return;
			}

			console.error(error);
			const parsedError = parsePlaygroundError(error);
			dispatch({ type: 'run:error', error: parsedError });
			toast.error(parsedError.title);
		}
	}, []);

	const runButtonState: RunButtonState =
		state.status === 'running' ? 'running' : 'default';

	const statusMessage =
		state.status === 'running'
			? 'Running segmentation...'
			: state.result
				? state.result.summary
				: state.selectedFile
					? `${state.selectedFile.name} selected.`
					: null;

	return {
		error: state.error,
		onFileSelected,
		onRunRequested,
		prompts: state.prompts,
		result: state.result,
		runButtonState,
		selectedFile: state.selectedFile,
		setPrompts,
		statusMessage,
	};
}
