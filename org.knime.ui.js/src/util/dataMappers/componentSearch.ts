import {
  ComponentSearchItem,
  type NodePortTemplate,
  PortType,
} from "@/api/gateway-api/generated-api";

import type { ExtendedPortType, NodeTemplateWithExtendedPorts } from "./common";

const PortTypeMapper: Record<string, PortType.KindEnum> = {
  table: PortType.KindEnum.Table,
  flowvariable: PortType.KindEnum.FlowVariable,
  generic: PortType.KindEnum.Generic,
  other: PortType.KindEnum.Other,
};

const mapPortType = (input: string | null | undefined): PortType.KindEnum => {
  const key = (input ?? "").trim().toLowerCase();
  return PortTypeMapper[key] ?? PortType.KindEnum.Other;
};

const toNodeTemplateWithExtendedPorts = (
  input: ComponentSearchItem,
): NodeTemplateWithExtendedPorts => {
  const inPorts = (input.inPorts ?? []).map((port) => {
    return {
      name: port.name ?? "",
      typeId: port.portTypeName,
      optional: port.optional,
      color: port.color,
      type: mapPortType(port.portTypeName),
      description: port.description ?? "",
      kind: mapPortType(port.portTypeName),
    } satisfies NodePortTemplate & ExtendedPortType;
  });

  const outPorts = (input.outPorts ?? []).map((port) => {
    return {
      name: port.name ?? "",
      typeId: port.portTypeName,
      optional: port.optional,
      color: port.color,
      type: mapPortType(port.portTypeName),
      description: port.description ?? "",
      kind: mapPortType(port.portTypeName),
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
