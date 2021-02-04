/* eslint-disable no-magic-numbers */
export const nodeSize = 32;
export const portSize = 9;

export const nodeStatusHeight = 12;
export const nodeStatusMarginTop = 8;

// NOTE: this width limit does not apply if a line contains very long words
export const maxNodeAnnotationWidth = 1000;
export const nodeAnnotationMarginTop = 8;
export const nodeNameMargin = 12;
export const nodeNameLineHeight = 14;

export const nodeSelectionPadding = [37, 34, 6, 34];

// Includes the NodeActionButtons. If more that 3 Buttons will be present
// it either needs to be widened or another hover area is needed
export const nodeHoverMargin = [47, 19, 8, 19];
export const nodeIdMargin = 16;
export const nodeActionBarButtonSpread = 25;

export const componentBackgroundPortion = 0.75;
export const nodeSelectionBarHeight = 12;

export const connectorWidth = 2;

export const workflowAnnotationPadding = 3;
export const nodeAnnotationPadding = 2;

export const canvasPadding = 2 * nodeSize;

export const tooltipArrowSize = 8;
export const tooltipMaxWidth = 250;

// horizontal position of the output ports bar if the user hasn't moved it
export const defaultMetanodeBarPosition = 1000;
export const metaNodeBarWidth = 10;
export const defaultMetaNodeBarHeight = 500;
