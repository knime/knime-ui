export type GeometryArea = {
  width: number;
  height: number;
};

export type GeometryBounds = {
  top: number;
  left: number;
  right?: number;
  bottom?: number;
} & GeometryArea;

export type Edge =
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left"
  | "top-left";
