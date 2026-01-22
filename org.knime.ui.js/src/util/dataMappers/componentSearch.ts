import {
  ComponentSearchItem,
  type NodePortTemplate,
  PortType,
} from "@/api/gateway-api/generated-api";

import type { ExtendedPortType, NodeTemplateWithExtendedPorts } from "./common";

const toNodeTemplateWithExtendedPorts = (
  input: ComponentSearchItem,
): NodeTemplateWithExtendedPorts => {
  const inPorts = (input.inPorts ?? []).map((port) => {
    return {
      name: port.name ?? "",
      typeId: port.portTypeName,
      optional: port.optional,
      color: port.color,
      type: port.portTypeName.toLowerCase(),
      description: port.description ?? "",
      kind: port.portTypeName as PortType.KindEnum,
    } satisfies NodePortTemplate & ExtendedPortType;
  });

  const outPorts = (input.outPorts ?? []).map((port) => {
    return {
      name: port.name ?? "",
      typeId: port.portTypeName,
      optional: port.optional,
      color: port.color,
      type: port.portTypeName.toLowerCase(),
      description: port.description ?? "",
      kind: port.portTypeName as PortType.KindEnum,
    } satisfies NodePortTemplate & ExtendedPortType;
  });

  return {
    id: input.id,
    name: input.name,
    type: input.type,
    component: true,
    icon: input.icon,
    inPorts,
    outPorts,
  };
};

export const componentSearch = { toNodeTemplateWithExtendedPorts };
