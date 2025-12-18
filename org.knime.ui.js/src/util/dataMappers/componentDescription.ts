import type {
  AvailablePortTypes,
  ComponentNodeDescription,
  ExtendedPortType,
} from "@/api/custom-types";

import { ports } from "./ports";

export type ComponentNodeDescriptionWithExtendedPorts =
  ComponentNodeDescription & {
    inPorts: ExtendedPortType[];
    outPorts: ExtendedPortType[];
  };

const toComponentNodeDescriptionWithExtendedPorts =
  (availablePortTypes: AvailablePortTypes) =>
  (
    node: ComponentNodeDescription,
  ): ComponentNodeDescriptionWithExtendedPorts => {
    const { inPorts = [], outPorts = [] } = node;

    return {
      ...node,
      inPorts: inPorts.map(ports.toExtendedPortObject(availablePortTypes)),
      outPorts: outPorts.map(ports.toExtendedPortObject(availablePortTypes)),
    };
  };

export const componentDescription = {
  toComponentNodeDescriptionWithExtendedPorts,
};
