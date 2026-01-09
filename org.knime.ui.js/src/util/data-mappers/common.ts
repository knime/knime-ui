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

export type ComponentNodeTemplateWithExtendedPorts = NodeTemplate & {
  /**
   * True if the component is owned by an account other than the current user.
   * Mirrors the gateway API isOwnedByAnotherIdentity flag.
   */
  isOwnedByAnotherIdentity: boolean;
  description: string;
  inPorts: Array<ExtendedPortType & { name: string; description: string }>;
  outPorts: Array<ExtendedPortType & { name: string; description: string }>;
};
