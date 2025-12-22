import type { NodeRelation } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";

export type QuickActionMenuAnchor = "top-left" | "top-right" | "bottom-left";

export type QuickActionMenuContentHeight =
  | `${number}px`
  | `${number}%`
  | "auto";

export type QuickActionMenuStyleConfig = {
  height: QuickActionMenuContentHeight;
  topOffset: number;
  anchor: QuickActionMenuAnchor;
};

export type QuickActionMenuContext = {
  nodeId: string | null;
  canvasPosition: XY;
  port: NodePort | null;
  nodeRelation: NodeRelation | null;
  updateMenuStyle: (config: Partial<QuickActionMenuStyleConfig>) => void;
  closeMenu: () => void;
};
