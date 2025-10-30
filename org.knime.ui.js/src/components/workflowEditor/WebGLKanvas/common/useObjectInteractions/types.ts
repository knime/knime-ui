import type { XY } from "@/api/gateway-api/generated-api";

export type ObjectMetadata =
  | { type: "node"; nodeId: string }
  | { type: "componentPlaceholder"; placeholderId: string }
  | { type: "annotation"; annotationId: string }
  | { type: "bendpoint"; bendpointId: string }
  | { type: "portbar"; containerId: string; side: "in" | "out" };

export type StartPosition = XY & { gridPositionDelta: XY };
