import type { NodeFactoryKey } from "@/api/gateway-api/generated-api";

export type KnimeNodeDragEventData =
  | { type: "component"; payload: { id: string; name: string } }
  | { type: "node"; payload: { nodeFactory: NodeFactoryKey } };
