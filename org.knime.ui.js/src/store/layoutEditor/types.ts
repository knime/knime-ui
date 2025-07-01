// type ComponentLayoutEditorNodeType = "view";

// type ComponentLayoutEditorNodeLayoutType = "view";

// type ComponentLayoutEditorNodeLayoutResizeMethod = "aspectRatio16by9";

export type ComponentLayoutEditorNodeLayout = {
  nodeID: string;
  type: string;
  resizeMethod?: string;
  resizeInterval?: null;
  resizeTolerance?: null;
  autoResize?: boolean;
  scrolling?: boolean;
  sizeHeight?: boolean;
  sizeWidth?: boolean;
  maxHeight?: null;
  maxWidth?: null;
  minHeight?: null;
  minWidth?: null;
  additionalClasses?: string[];
  additionalStyles?: string[];
};

export type ComponentLayoutEditorNode = {
  nodeID: string;
  preview: null;
  availableInView: boolean;
  availableInDialog?: boolean;
  description: string | null;
  icon: Base64URLString;
  type: string;
  layout: ComponentLayoutEditorNodeLayout;
  name: string;
};

export type ComponentLayoutView = {
  nodeID: string;
  type: string;
  scrolling?: boolean;
  useLegacyMode?: boolean;
  resizeMethod?: string;
  autoResize?: boolean;
  sizeHeight?: boolean;
  sizeWidth?: boolean;
};

export type ComponentLayoutColumnContent =
  | ComponentLayoutView
  // eslint-disable-next-line no-use-before-define
  | ComponentLayoutRow;

export type ComponentLayoutColumn = {
  content: Array<ComponentLayoutColumnContent>;
  widthXS: number;
};

export type ComponentLayoutRow = {
  type: "row";
  columns: ComponentLayoutColumn[];
};

export type ComponentLayout = {
  rows: ComponentLayoutRow[];
};

export type RowTemplate = {
  name: string;
  data: ComponentLayoutRow;
};
