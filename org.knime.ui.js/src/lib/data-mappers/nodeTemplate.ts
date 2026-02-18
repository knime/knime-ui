import type { AvailablePortTypes } from "@/api/custom-types";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import { ComponentSearchItem, PortType } from "@/api/gateway-api/generated-api";

import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "./common";
import { ports } from "./ports";

/**
 * Maps a node object and adds to every of its ports all the properties of the PortObject schema from the API
 * @param availablePortTypes Dictionary of all available port types and their information
 * @returns mapping function that takes a node to which all the port information will be added
 */
const toNodeTemplateWithExtendedPorts =
  (availablePortTypes: AvailablePortTypes) =>
  (node: NodeTemplate): NodeTemplateWithExtendedPorts => {
    const { inPorts = [], outPorts = [] } = node;

    return {
      ...node,
      inPorts: inPorts.map(ports.toExtendedPortObject(availablePortTypes)),
      outPorts: outPorts.map(ports.toExtendedPortObject(availablePortTypes)),
    };
  };

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

const toComponentTemplateWithExtendedPorts = (
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

const isComponentNodeTemplate = (
  template: NodeTemplateWithExtendedPorts,
): template is ComponentNodeTemplateWithExtendedPorts =>
  Boolean(template.component);

export const nodeTemplate = {
  toNodeTemplateWithExtendedPorts,
  toComponentTemplateWithExtendedPorts,
  isComponentNodeTemplate,
};
