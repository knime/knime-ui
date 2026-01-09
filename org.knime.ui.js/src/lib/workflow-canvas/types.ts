import type { XY } from "@/api/gateway-api/generated-api";

export type WorkflowObject = XY & {
  id: string;
  type: "node" | "annotation" | "componentPlaceholder";
  width?: number;
  height?: number;
};
