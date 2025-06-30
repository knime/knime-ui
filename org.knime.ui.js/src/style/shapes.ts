/* eslint-disable no-magic-numbers */
export const nodeSize = 32;
export const portSize = 9;
export const portActionButtonSize = 20;
export const portActionsGapSize = 5;

export const addNodeGhostSize = 20;

export const nodeTorsoRadius = 2.8;
export const nodeStatusHeight = 12;
export const nodeStatusMarginTop = 8;

// horizontal node padding to include the full name on the workflow
export const horizontalNodePadding = 50;

// NOTE: this width limit does not apply if a line contains very long words
export const nodeAnnotationMarginTop = 8;
export const nodeNameMargin = 7;
export const nodeNameLineHeight = 14;
export const nodeNameFontSize = 12;
export const nodeNamePadding = 2;
export const nodeNameHorizontalMargin = 4;

export const nodeNameMaxLines = 2;

export const nodeSelectionPaddingTop =
  37 - (nodeNameLineHeight + nodeNamePadding * 2);
export const nodeSelectionPaddingLeft = 34;
export const nodeSelectionPaddingRight = 34;
export const nodeSelectionPaddingBottom = 6;
export const nodeSelectionPadding = [
  nodeSelectionPaddingTop,
  nodeSelectionPaddingLeft,
  nodeSelectionPaddingBottom,
  nodeSelectionPaddingRight,
];

// This is different as the way we calculate the size of the text is better now
export const webGlNodeSelectionPaddingTop = 27;
export const webGlNodeActionBarYOffset = 4;
export const webGlNodeHoverAreaPadding = 6;

export const maxNodeNameWidth =
  (nodeSelectionPaddingLeft + nodeSize + nodeSelectionPaddingRight) * 1.7; // 170px

export const nodeWidthWithPadding =
  nodeSelectionPaddingLeft + nodeSelectionPaddingRight + nodeSize;

export const metanodeLabelOffsetY = nodeSize + nodeAnnotationMarginTop;
export const nodeLabelOffsetY =
  nodeSize + nodeAnnotationMarginTop + (nodeStatusHeight + nodeStatusMarginTop);
export const metanodeLabelActionBarOffset =
  nodeWidthWithPadding / 2 - (nodeStatusHeight + nodeStatusMarginTop + 2);
export const nodeLabelActionBarOffset = nodeWidthWithPadding / 2 - 2;

export const nodeNameEditorMinWidth = 10;

// Margins including 3 NodeActionButtons. If more that 3 Buttons are present,
// the hover area is widened by Node.vue
export const nodeHoverMargin = [29, 19, 8, 19];
export const nodeHoverPortBottomMargin = 15;
export const nodeIdMargin = 16;
export const nodeActionBarButtonSpread = 25;

export const componentBackgroundPortion = 0.75;
export const nodeSelectionBarHeight = 12;

export const connectorWidth = 1;
export const highlightedConnectorWidth = 2;
export const selectedConnectorWidth = 3;

export const workflowAnnotationPadding = 3;
export const nodeAnnotationPadding = 2;

export const tooltipArrowSize = 12;
export const tooltipMaxWidth = 540;
export const tooltipMaxHeight = 200;

// horizontal position of the output ports bar if the user hasn't moved it
export const defaultMetanodeBarPosition = 1000;
export const autoPositionMetanodeMargin = 50;
export const metaNodeBarWidth = 10;
export const metaNodeBarHorizontalPadding = 13;
export const defaultMetaNodeBarHeight = 500;

export const gridSize = { x: 5, y: 5 };
export const layoutEditorGridSize = 12;

export const selectedItemBorderRadius = 4;
export const selectedNodeStrokeWidth = 1;
export const selectedAnnotationStrokeWidth = 2;

// annotations use a virtual "point" size that needs to be converted to pixels by this factor
export const annotationsFontSizePointToPixelFactor = 1.3333; // used to be: 4/3

export const annotationToolbarContainerWidth = 300;
export const annotationToolbarContainerHeight = 60;

export const defaultAddWorkflowAnnotationWidth = 250;
export const defaultAddWorkflowAnnotationHeight = 150;
export const quickActionMenuWidth = 360; // px

export const floatingCanvasToolsSize = 36; // px
export const floatingCanvasToolsBottomOffset = 16; // px
export const canvasMinimapAspectRatio = 4 / 3;
