import type {
  NodeTemplate,
  PortType,
  SpaceItemReference,
} from "@/api/gateway-api/generated-api";

export type ComponentSpaceItemReference = Omit<SpaceItemReference, "spaceId"> & {
  spaceId?: string;
};

export type ExtendedPortType = PortType & {
  typeId: string;
  type?: string;
  description: string;
};

export type NodeTemplateWithExtendedPorts = NodeTemplate & {
  inPorts: ExtendedPortType[];
  outPorts: ExtendedPortType[];
  spaceItemReference?: ComponentSpaceItemReference;
  componentName?: string;
};
