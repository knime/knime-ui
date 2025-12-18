import type {
  AvailablePortTypes,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";

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

export const nodeTemplate = { toNodeTemplateWithExtendedPorts };
