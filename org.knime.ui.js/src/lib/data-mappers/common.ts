import type {
  NodeTemplate,
  Owner,
  PortType,
} from "@/api/gateway-api/generated-api";

export type ExtendedPortType = PortType & {
  typeId: string;
  type?: string;
  description: string;
};

export type NodeTemplateWithExtendedPorts = NodeTemplate & {
  inPorts: ExtendedPortType[];
  outPorts: ExtendedPortType[];
};

export type ComponentNodeTemplateWithExtendedPorts = NodeTemplate & {
  containingSpace?: string;
  owner?: Owner;
  description: string;
  inPorts: Array<ExtendedPortType & { name: string; description: string }>;
  outPorts: Array<ExtendedPortType & { name: string; description: string }>;
};
