/* eslint-disable no-use-before-define */

/**
 * Layout context
 */
export type LayoutContext = null | {
  projectId: string;
  workflowId: string;
  nodeId: string;
};

/**
 * Nodes (options to be added to the layout)
 */

export type RowElementTemplate = {
  name: string;
  data: LayoutEditorRowItem;
};

export type LayoutEditorNodeType =
  | "legacyView"
  | "view"
  | "quickform"
  | "nestedLayout"
  | "html";

export type LayoutEditorNode = {
  nodeID: string;
  availableInView?: boolean;
  availableInDialog?: boolean;
  description?: string | null;
  icon: string;
  type: LayoutEditorNodeType;
  templateId: string | null;
  /**
   * Properties of the node item that will be used when this
   * node is added to the layout.
   */
  layout: LayoutEditorViewItem | LayoutEditorNestedLayoutItem;
  name: string;
};

export type LayoutEditorViewNode = LayoutEditorNode & {
  type: "view" | "legacyView";
};

export type LayoutEditorQuickformNode = LayoutEditorNode & {
  type: "quickform";
};

export type LayoutEditorNestedLayoutNode = LayoutEditorNode & {
  type: "nestedLayout";
  containerLegacyModeEnabled: boolean;
};

/**
 * Items (options already added to the layout)
 */

type LayoutEditorItemType = "row" | "view" | "nestedLayout" | "html";

type LayoutEditorViewResizeMethod =
  | "aspectRatio16by9"
  | "aspectRatio4by3"
  | "aspectRatio1by1"
  | "viewLowestElement"
  | "auto"
  | "viewBodyOffset"
  | "viewBodyScroll"
  | "viewDocumentElementOffset"
  | "viewDocumentElementScroll"
  | "viewMax"
  | "viewMin"
  | "viewGrow"
  | "viewTaggedElement"
  | "viewLowestElementIEMax"
  | "manual";

type NodeID = {
  nodeID: string;
};

type LayoutEditorBaseProps = {
  type: LayoutEditorItemType;
  useLegacyMode?: boolean;
  resizeMethod?: LayoutEditorViewResizeMethod;
  resizeInterval?: number | null;
  resizeTolerance?: number | null;
  autoResize?: boolean;
  scrolling?: boolean;
  sizeHeight?: boolean;
  sizeWidth?: boolean;
  maxHeight?: number | null;
  maxWidth?: number | null;
  minHeight?: number | null;
  minWidth?: number | null;
  additionalClasses?: string[];
  additionalStyles?: string[];
};

export type LayoutEditorRowItem = {
  type: "row";
  columns: LayoutEditorColumn[];
};

export const isRowItem = (
  item: LayoutEditorItem,
): item is LayoutEditorRowItem =>
  Boolean((item as LayoutEditorRowItem).type === "row");

export type LayoutEditorViewItem = NodeID &
  LayoutEditorBaseProps & {
    type: "view";
  };

export const isViewItem = (
  node: LayoutEditorItem,
): node is LayoutEditorViewItem =>
  Boolean((node as LayoutEditorViewItem).type === "view");

export type LayoutEditorNestedLayoutItem = NodeID & {
  type: "nestedLayout";
};

export const isNestedLayoutItem = (
  node: LayoutEditorItem,
): node is LayoutEditorNestedLayoutItem =>
  Boolean((node as LayoutEditorNestedLayoutItem).type === "nestedLayout");

export type LayoutEditorHtmlItem = {
  type: "html";
  value: string;
};

export type LayoutEditorItem =
  | LayoutEditorRowItem
  | LayoutEditorViewItem
  | LayoutEditorNestedLayoutItem
  | LayoutEditorHtmlItem;

export type LayoutEditorItemSizingConfig = Pick<
  LayoutEditorBaseProps,
  "resizeMethod" | "minWidth" | "maxWidth" | "minHeight" | "maxHeight"
>;

export type LayoutEditorColumn = {
  content: Array<LayoutEditorItem>;
  widthXS: number;
  widthSM?: number;
  widthMD?: number;
  widthLG?: number;
  widthXL?: number;
};

export type LayoutEditorViewLayout = {
  rows: LayoutEditorRowItem[];
  parentLayoutLegacyMode: boolean;
};

export type ResizeColumnInfo = null | {
  column: LayoutEditorColumn;
  clientX: number;
  gridStepWidth: number;
  originalWidthXS: number;
  columns?: LayoutEditorColumn[];
  nextSibling?: LayoutEditorColumn;
  widthOfOtherSiblings?: number;
};
