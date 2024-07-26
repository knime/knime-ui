import type {
  DynamicPortGroupDescription,
  NativeNodeDescription,
  NodeTemplate,
} from "@/api/gateway-api/generated-api";
import type {
  AvailablePortTypes,
  ComponentNodeDescription,
  ExtendedPortType,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";

/**
 * The purpose of these helpers is to map all required information on ports that
 * is not directly provided by the API. Normally, port objects
 * have limited information and only list their typeId which uniquely identifies that port.
 * Any other information on ports, such as color, kind, and other properties declared in
 * PortType are only available by accessing the global dictionary of
 * installed ports via the global application state property `availablePortTypes` and then
 * indexing in using the unique port typeId. These mapping utilities provide reusable
 * functionality to do just that, returning `ExtendedPort`s that contain all the information
 * from their corresponding PortTypes
 */

/**
 * Maps a port `typeId` string or a object with a `typeId` property to a port object with all the properties of the
 * PortObject schema from the API
 * @param availablePortTypes Dictionary of all available port types and their information
 * @param includeType whether to include a `type` property holding the value of the port kind.
 * This is necessary when the data will injected (down the line) into the PortIcon component from webapps-common
 * which uses a `type` prop instead of a `kind`
 * @returns mapping function that takes either a string that represents the port type id, or an object
 * with a `typeId` property. This mapping function will return the whole port object with information about color, kind,
 * etc
 */
export const toExtendedPortObject =
  (availablePortTypes: AvailablePortTypes, includeType = true) =>
  (input: string | { typeId: string }): ExtendedPortType => {
    const isStringInput = typeof input === "string";
    const fullPortObject = isStringInput
      ? availablePortTypes[input]
      : availablePortTypes[input.typeId];

    const result: ExtendedPortType = {
      ...fullPortObject,
      description: "No description available",
      typeId: isStringInput ? input : input?.typeId,
    };

    return includeType
      ? {
          ...result,
          // NodePreview component in webapps-common uses a `type` prop instead of kind.
          // See: WorkflowMetadata.vue or NodeTemplate.vue
          type: fullPortObject.kind,
          // eslint-disable-next-line @typescript-eslint/no-extra-parens
          ...(typeof input === "string" ? {} : input),
        }
      : result;
  };

/**
 * Maps a node object and adds to every of its ports all the properties of the PortObject schema from the API
 * @param availablePortTypes Dictionary of all available port types and their information
 * @returns mapping function that takes a node to which all the port information will be added
 */
export const toNodeTemplateWithExtendedPorts =
  (availablePortTypes: AvailablePortTypes) =>
  (node: NodeTemplate): NodeTemplateWithExtendedPorts => {
    const { inPorts = [], outPorts = [] } = node;

    return {
      ...node,
      inPorts: inPorts.map(toExtendedPortObject(availablePortTypes)),
      outPorts: outPorts.map(toExtendedPortObject(availablePortTypes)),
    };
  };

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
      .map(toExtendedPortObject(availablePortTypes))
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
export const toNativeNodeDescriptionWithExtendedPorts =
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
      inPorts: inPorts.map(toExtendedPortObject(availablePortTypes)),
      outPorts: outPorts.map(toExtendedPortObject(availablePortTypes)),
      dynInPorts: dynamicInPortGroupDescriptions.map(
        toPortGroupDescriptionWithExtendedPorts(availablePortTypes),
      ),
      dynOutPorts: dynamicOutPortGroupDescriptions.map(
        toPortGroupDescriptionWithExtendedPorts(availablePortTypes),
      ),
    };
  };

export type ComponentNodeDescriptionWithExtendedPorts =
  ComponentNodeDescription & {
    inPorts: ExtendedPortType[];
    outPorts: ExtendedPortType[];
  };

export const toComponentNodeDescriptionWithExtendedPorts =
  (availablePortTypes: AvailablePortTypes) =>
  (
    node: ComponentNodeDescription,
  ): ComponentNodeDescriptionWithExtendedPorts => {
    const { inPorts = [], outPorts = [] } = node;

    return {
      ...node,
      inPorts: inPorts.map(toExtendedPortObject(availablePortTypes)),
      outPorts: outPorts.map(toExtendedPortObject(availablePortTypes)),
    };
  };
