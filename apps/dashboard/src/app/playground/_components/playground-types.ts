import type { SegmentResult, SegmentVideoResult } from '@segmentationapi/sdk';

export type PlaygroundMaskPreview = {
	url: string;
};

export type PlaygroundMode = 'image' | 'video';
export type PlaygroundVideoPromptMode = 'points' | 'boxes';
export type PlaygroundVideoSamplingMode = 'default' | 'fps' | 'numFrames';

export type PlaygroundVideoPoint = {
	label: number;
	objectId: string;
	x: number;
	y: number;
};

export type PlaygroundVideoBox = {
	objectId: string;
	x1: number;
	x2: number;
	y1: number;
	y2: number;
};

export type PlaygroundResult =
	| {
			mode: 'image';
			previewMasks: PlaygroundMaskPreview[];
			raw: SegmentResult;
			summary: string;
	  }
	| {
			mode: 'video';
			raw: SegmentVideoResult;
			summary: string;
	  };

export type PlaygroundVideoSamplingState = {
	fps: string;
	maxFrames: string;
	mode: PlaygroundVideoSamplingMode;
	numFrames: string;
};

export type PlaygroundErrorState = {
	details: string[];
	title: string;
};

export type PlaygroundStatus = 'idle' | 'ready' | 'running';

export type RunButtonState = 'default' | 'running';
