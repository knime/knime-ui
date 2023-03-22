// eslint-disable-next-line object-curly-newline
import type {
    PortType,
    DynamicPortGroupDescription,
    NativeNodeDescription
// eslint-disable-next-line object-curly-newline
} from '@/api/gateway-api/generated-api';

type AvailablePortTypes = Record<string, PortType>
type FullPortType = PortType & { typeId: string; type?: string; }
type PortGroupDescription = {
    groupName: string;
    groupDescription: string;
    types: Array<FullPortType & { typeName: string }>
}

/**
 * Maps a port `typeId` string or a object with a `typeId` property to a port object with all the properties of the
 * PortObject schema from the API
 * @param {AvailablePortTypes} availablePortTypes Dictionary of all available port types and their information
 * @param {Boolean} includeType whether to include a `type` property holding the value of the port kind.
 * This is necessary when the data will injected (down the line) into the PortIcon component from webapps-common
 * which uses a `type` prop instead of a `kind`
 * @returns {Function} mapping function that takes either a string that represents the port type id, or an object
 * with a `typeId` property. This mapping function will return the whole port object with information about color, kind,
 * etc
 */
export const toPortObject = (
    availablePortTypes: AvailablePortTypes,
    includeType = true
) => (
    input: string | { typeId: string }
): FullPortType => {
    const isStringInput = typeof input === 'string';
    const fullPortObject = isStringInput
        ? availablePortTypes[input]
        : availablePortTypes[input.typeId];

    const result = {
        ...fullPortObject,
        description: 'No description available', // Default text if no description available
        typeId: isStringInput ? input : input?.typeId
    };

    return includeType
        ? {
            ...result,
            // NodePreview component in webapps-common uses a `type` prop instead of kind.
            // See: WorkflowMetadata.vue or NodeTemplate.vue
            type: fullPortObject.kind,
            // eslint-disable-next-line @typescript-eslint/no-extra-parens
            ...(typeof input === 'string' ? {} : input)
        }
        : result;
};

/**
 * Processes a dynamic port group description so it can be rendered.
 * @param {Object} availablePortTypes Dictionary of all available port types and their information
 * @returns {Function} A function that maps the raw port group description as it was received to the format needed to
 * to render it.
 */
const toPortGroupDescription = (
    availablePortTypes: AvailablePortTypes
) => (
    portGroupDescription: DynamicPortGroupDescription
): PortGroupDescription => {
        const { identifier, description, supportedPortTypes } = portGroupDescription;
        const types = supportedPortTypes
            .map(toPortObject(availablePortTypes))
            .map(fullPortType => ({
                ...fullPortType,
                typeName: (fullPortType.name.substring(0, 20)) + (fullPortType.name.length > 20 ? '...' : '')
            }));

        return {
            groupName: identifier,
            groupDescription: description,
            types
        };
    };

/**
 * Maps over a collection of ports to add information about their color and kind, extracted from the
 * provided dictionary in the parameter `availablePortTypes`
 * @param {Array} ports
 * @param {Record<string, any>} availablePortTypes
 * @returns {Array} ports
 */
export const mapPortTypes = (
    ports: Array<string | { typeId: string }> = [],
    availablePortTypes: AvailablePortTypes = {}
) => ports.map(toPortObject(availablePortTypes));

/**
 * Maps a node object and adds to every of its ports all the properties of the PortObject schema from the API
 * @param {Object} availablePortTypes Dictionary of all available port types and their information
 * @returns {Function} mapping function that takes a node to which all the port information will be added
 */
export const toNodeWithFullPorts = (availablePortTypes: AvailablePortTypes) => (node: NativeNodeDescription) => {
    const {
        inPorts = [],
        outPorts = [],
        dynamicInPortGroupDescriptions = [],
        dynamicOutPortGroupDescriptions = []
    } = node;

    return {
        ...node,
        inPorts: inPorts.map(toPortObject(availablePortTypes)),
        outPorts: outPorts.map(toPortObject(availablePortTypes)),
        dynInPorts: dynamicInPortGroupDescriptions.map(toPortGroupDescription(availablePortTypes)),
        dynOutPorts: dynamicOutPortGroupDescriptions.map(toPortGroupDescription(availablePortTypes))
    };
};
