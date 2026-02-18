import type { NodeCategory } from "@/api/gateway-api/generated-api";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";

export type NodeCategoryWithExtendedPorts = NodeCategory & {
  nodes?: NodeTemplateWithExtendedPorts[];
};
