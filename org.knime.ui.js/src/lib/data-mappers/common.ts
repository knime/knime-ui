import type { NodeTemplate, PortType } from "@/api/gateway-api/generated-api";

export type ExtendedPortType = PortType & {
  typeId: string;
  type?: string;
  description: string;
};

export type NodeTemplateWithExtendedPorts = NodeTemplate & {
  inPorts: ExtendedPortType[];
  outPorts: ExtendedPortType[];
};
