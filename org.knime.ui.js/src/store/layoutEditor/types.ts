// type ComponentLayoutNodeType = "view";

// type ComponentLayoutViewType = "view";

// type ComponentLayoutViewResizeMethod = "aspectRatio16by9";

export type ComponentLayoutView = {
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

export type ComponentLayoutViewConfig = Pick<
  ComponentLayoutView,
  "resizeMethod" | "minWidth" | "maxWidth" | "minHeight" | "maxHeight"
>;

export type ComponentLayoutNode = {
  nodeID: string;
  preview: null;
  availableInView: boolean;
  availableInDialog?: boolean;
  description: string | null;
  icon: Base64URLString;
  type: string;
  layout: ComponentLayoutView;
  name: string;
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
