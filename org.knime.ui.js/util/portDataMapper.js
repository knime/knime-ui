/**
 * Maps over a collection of ports to add information about their color and kind, extracted from the
 * provided dictionary in the parameter `availablePortTypes`
 * @param {Array} ports
 * @param {Record<string, any>} availablePortTypes
 * @returns {Array} ports
 */
export const mapPortTypes = (ports = [], availablePortTypes = {}) => ports.map(port => ({
    ...port,
    type: availablePortTypes[port.typeId].kind,
    color: availablePortTypes[port.typeId].color
}));

/**
 * Maps over a collection of nodes in order to add to their ports information about each
 * port's color and kind. This information will be read from the provided `availablePortTypes` parameter
 * which acts as a dictionary of all the ports' metadata and is indexed by the
 * fully qualified name of the port (aka `typeId`)
 *
 * @param {{ inPorts: Array, outPorts: Array }} nodes
 * @param {Record<string, any>} availablePortTypes
 * @returns {{ inPorts: Array, outPorts: Array }} mapped nodes
 */
export const mapNodePorts = (nodes = [], availablePortTypes) => nodes.map((node) => {
    const { inPorts = [], outPorts = [] } = node;
    const mappedInPorts = mapPortTypes(inPorts, availablePortTypes);
    const mappedOutPorts = mapPortTypes(outPorts, availablePortTypes);
    return { ...node, inPorts: mappedInPorts, outPorts: mappedOutPorts };
});
