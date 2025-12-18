import type { AvailablePortTypes, ExtendedPortType } from "@/api/custom-types";
import type {
  DynamicPortGroupDescription,
  NativeNodeDescription,
} from "@/api/gateway-api/generated-api";

import { ports } from "./ports";

type PortGroupDescription = {
  groupName: string;
  groupDescription: string;
  types: Array<ExtendedPortType & { typeName: string }>;
};

/**
 * Processes a dynamic port group description so it can be rendered.
 * @param availablePortTypes Dictionary of all available port types and their information
 * @returns A function that maps the raw port group description as it was received to the format needed to
 * to render it.
 */
const toPortGroupDescriptionWithExtendedPorts =
  (availablePortTypes: AvailablePortTypes) =>
  (portGroupDescription: DynamicPortGroupDescription): PortGroupDescription => {
    const {
      identifier,
      description = "No description available",
      supportedPortTypes = [],
    } = portGroupDescription;

    const types: PortGroupDescription["types"] = supportedPortTypes
      .map(ports.toExtendedPortObject(availablePortTypes))
      .map((fullPortType) => ({
        ...fullPortType,
        typeName: fullPortType.name,
      }));

    return {
      groupName: identifier,
      groupDescription: description,
      types,
    };
  };

export type NativeNodeDescriptionWithExtendedPorts = NativeNodeDescription & {
  inPorts: ExtendedPortType[];
  outPorts: ExtendedPortType[];
  dynInPorts: PortGroupDescription[];
  dynOutPorts: PortGroupDescription[];
};

/**
 * Maps a node object and adds to every of its ports all the properties of the PortObject schema from the API
 * @param availablePortTypes Dictionary of all available port types and their information
 * @returns mapping function that takes a node to which all the port information will be added
 */
const toNativeNodeDescriptionWithExtendedPorts =
  (availablePortTypes: AvailablePortTypes) =>
  (node: NativeNodeDescription): NativeNodeDescriptionWithExtendedPorts => {
    const {
      inPorts = [],
      outPorts = [],
      dynamicInPortGroupDescriptions = [],
      dynamicOutPortGroupDescriptions = [],
    } = node;

    return {
      ...node,
      inPorts: inPorts.map(ports.toExtendedPortObject(availablePortTypes)),
      outPorts: outPorts.map(ports.toExtendedPortObject(availablePortTypes)),
      dynInPorts: dynamicInPortGroupDescriptions.map(
        toPortGroupDescriptionWithExtendedPorts(availablePortTypes),
      ),
      dynOutPorts: dynamicOutPortGroupDescriptions.map(
        toPortGroupDescriptionWithExtendedPorts(availablePortTypes),
      ),
    };
  };

export const nodeDescription = { toNativeNodeDescriptionWithExtendedPorts };
