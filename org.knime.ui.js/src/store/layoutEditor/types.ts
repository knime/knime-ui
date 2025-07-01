// type ComponentLayoutEditorNodeType = "view";

// type ComponentLayoutEditorNodeLayoutType = "view";

// type ComponentLayoutEditorNodeLayoutResizeMethod = "aspectRatio16by9";

export interface ComponentLayoutEditorNodeLayout {
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
}

export interface ComponentLayoutEditorNode {
  nodeID: string;
  preview: null;
  availableInView: boolean;
  availableInDialog?: boolean;
  description: string | null;
  icon: Base64URLString;
  type: string;
  layout: ComponentLayoutEditorNodeLayout;
  name: string;
}

export interface ComponentLayoutColumn {
  content: unknown[];
  widthXS: number;
}

export interface ComponentLayoutRow {
  type: "row";
  columns: ComponentLayoutColumn[];
}

export interface ComponentLayout {
  rows: ComponentLayoutRow[];
}

export interface RowTemplate {
  name: string;
  data: { type: string; columns: ComponentLayoutColumn[] };
}
