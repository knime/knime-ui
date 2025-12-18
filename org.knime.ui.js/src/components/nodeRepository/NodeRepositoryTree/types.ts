import type { NodeCategory } from "@/api/gateway-api/generated-api";
import type { NodeTemplateWithExtendedPorts } from "@/util/dataMappers";

export type NodeCategoryWithExtendedPorts = NodeCategory & {
  nodes?: NodeTemplateWithExtendedPorts[];
};
