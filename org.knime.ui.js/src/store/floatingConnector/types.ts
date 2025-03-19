import type { NodePortGroups } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import type { Direction } from "@/util/compatibleConnections";

export type FloatingConnector = {
  id: string;
  flowVariableConnection: boolean;
  absolutePoint: XY;
  allowedActions: { canDelete: boolean };
  context: {
    origin: "in" | "out";
    parentNodeId: string;
    portInstance: NodePort;
  };
  interactive?: boolean;
  sourceNode?: string;
  sourcePort?: number;
  destNode?: string;
  destPort?: number;
};

type SnapTargetCommon = {
  parentNodeId: string;
  side: Direction;
};

export type SnappedPlaceholderPort = {
  isPlaceHolderPort: true;
  validPortGroups: NodePortGroups | null;
  typeId: string;
} & SnapTargetCommon;

export type SnappedPort = NodePort & SnapTargetCommon;

export type SnapTarget = SnappedPort | SnappedPlaceholderPort;

export const isPlaceholderPort = (
  port: SnapTarget,
): port is SnappedPlaceholderPort =>
  (port as { isPlaceHolderPort: true }).isPlaceHolderPort;
