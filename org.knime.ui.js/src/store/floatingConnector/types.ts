import type { NodePortGroups } from "@/api/custom-types";
import type { NodePort, XY } from "@/api/gateway-api/generated-api";
import type { Direction } from "@/util/compatibleConnections";

export type FloatingDecoratorOnly = {
  id: "floating-decorator-only";
  absolutePoint: XY;
  context: {
    origin: "in" | "out";
  };
};

export type FullFloatingConnector = {
  id: "full-floating-connector";
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

export type FloatingConnector = FloatingDecoratorOnly | FullFloatingConnector;

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

export const isDecoratorOnly = (
  floatingConnector: FloatingConnector,
): floatingConnector is FloatingDecoratorOnly =>
  floatingConnector.id === "floating-decorator-only";

export const isFullFloatingConnector = (
  floatingConnector: FloatingConnector,
): floatingConnector is FullFloatingConnector =>
  floatingConnector.id === "full-floating-connector";
