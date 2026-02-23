import type { SegmentResult } from '@segmentationapi/sdk';

export type PlaygroundMaskPreview = {
	url: string;
};

export type PlaygroundResult = {
	raw: SegmentResult;
	previewFileIndex: number;
	previewMasks: PlaygroundMaskPreview[];
	summary: string;
};

export type PlaygroundErrorState = {
	details: string[];
	title: string;
};

export type PlaygroundStatus = 'idle' | 'ready' | 'running';

export type RunButtonState = 'default' | 'running';
