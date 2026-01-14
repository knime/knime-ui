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
      type: port.portTypeName,
      description: port.description ?? "",
      kind: PortType.KindEnum.Other, // TODO: NXT-4364 add port info
    } satisfies NodePortTemplate & ExtendedPortType;
  });

  const outPorts = (input.outPorts ?? []).map((port) => {
    return {
      name: port.name ?? "",
      typeId: port.portTypeName,
      optional: port.optional,
      color: port.color,
      type: port.portTypeName,
      description: port.description ?? "",
      kind: PortType.KindEnum.Other, // TODO: NXT-4364 add port info
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
