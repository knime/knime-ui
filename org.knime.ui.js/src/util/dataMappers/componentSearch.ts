import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { ComponentSearchItem } from "@/api/gateway-api/generated-api";

const toNodeTemplateWithExtendedPorts = (
  input: ComponentSearchItem,
): NodeTemplateWithExtendedPorts => {
  return {
    id: input.name,
    name: input.name,
    type: input.type,
    component: true,
    icon: input.icon,
    inPorts: [],
    outPorts: [],
  };
};

export const componentSearch = { toNodeTemplateWithExtendedPorts };
