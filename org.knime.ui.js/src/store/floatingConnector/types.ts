import type { NodePortGroups } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";

export type FloatingConnector = {
  id: string;
  flowVariableConnection: boolean;
  absolutePoint: XY;
  allowedActions: { canDelete: boolean };
  context: {
    origin: "in" | "out";
    parentNodeId: string;
    portInstance: NodePort;
    portPosition: XY;
  };
  interactive?: boolean;
  sourceNode?: string;
  sourcePort?: number;
  destNode?: string;
  destPort?: number;
};

type SnapTargetParent = {
  parentNodeId: string;
};

export type PlaceholderPort = {
  isPlaceHolderPort: true;
  validPortGroups: NodePortGroups | null;
  typeId: string;
};

export type SnapTarget = (PlaceholderPort | NodePort) & SnapTargetParent;

export const isPlaceholderPort = (
  port: NodePort | { isPlaceHolderPort: true },
): port is { isPlaceHolderPort: true } =>
  (port as { isPlaceHolderPort: true }).isPlaceHolderPort;
