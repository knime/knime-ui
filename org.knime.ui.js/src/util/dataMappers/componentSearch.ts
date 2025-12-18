import type {
  ExtendedPortType,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";
import {
  type ComponentSearchItem,
  type NodePortTemplate,
  PortType,
} from "@/api/gateway-api/generated-api";

import KindEnum = PortType.KindEnum;

const toNodeTemplateWithExtendedPorts = (
  input: ComponentSearchItem,
): NodeTemplateWithExtendedPorts => {
  let inPorts = input.inPorts ?? [];
  let mappedIn = inPorts.map((p) => {
    return {
      name: p.name ?? "",
      typeId: "typeid",
      optional: p.optional ?? false,
      color: p.color,
      type: p.portTypeName,
      description: p.description ?? "",
      kind: KindEnum.Other, // ~todo
    } satisfies NodePortTemplate & ExtendedPortType;
  });
  const mappedOut = (input.outPorts ?? []).map((p) => {
    return {
      name: p.name ?? "",
      typeId: "typeid",
      optional: p.optional ?? false,
      color: p.color,
      type: p.portTypeName,
      description: p.description ?? "",
      kind: KindEnum.Other, // ~todo
    } satisfies NodePortTemplate & ExtendedPortType;
  });
  // const outPorts = input.outPorts ?? [];
  return {
    id: input.name,
    name: input.name,
    type: input.type,
    component: true,
    icon: input.icon,
    inPorts: mappedIn,
    outPorts: mappedOut,
  };
};

export const componentSearch = { toNodeTemplateWithExtendedPorts };
