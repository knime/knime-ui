import { ComponentSearchItem, PortType } from "@/api/gateway-api/generated-api";

import type { ComponentNodeTemplateWithExtendedPorts } from "./common";

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
): ComponentNodeTemplateWithExtendedPorts => {
  const inPorts = (input.inPorts ?? []).map((port) => {
    return {
      name: port.name ?? "",
      typeId: port.portTypeId,
      optional: port.optional,
      color: port.color,
      type: mapPortType(port.portTypeName),
      description: port.description ?? "",
      kind: mapPortType(port.portTypeName),
    } satisfies ComponentNodeTemplateWithExtendedPorts["inPorts"][number];
  });

  const outPorts = (input.outPorts ?? []).map((port) => {
    return {
      name: port.name ?? "",
      typeId: port.portTypeId,
      optional: port.optional,
      color: port.color,
      type: mapPortType(port.portTypeName),
      description: port.description ?? "",
      kind: mapPortType(port.portTypeName),
    } satisfies ComponentNodeTemplateWithExtendedPorts["outPorts"][number];
  });

  return {
    id: input.id,
    description: input.description ?? "",
    name: input.name,
    type: input.type,
    component: true,
    icon: input.icon,
    containingSpace: input.containingSpace,
    owner: input.owner,
    inPorts,
    outPorts,
  };
};

export const componentSearch = { toNodeTemplateWithExtendedPorts };
