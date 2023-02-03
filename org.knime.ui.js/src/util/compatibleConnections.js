import { toPortObject } from '@/util/portDataMapper';

/**
 * circleDetection returns all nodes that can be connected to startNode without closing a circle
 * @param {String} startNode id of node in question
 * @param {Boolean} downstreamConnection direction of intended connection
 * @param {Array} nodes nodes
 * @param {Array} connections
 * @param {Object} workflowInfo
 * @returns {Set<String>} returns a Set of nodes that startNode can be connected to
 */
export const circleDetection =
    ({
        startNode,
        downstreamConnection,
        workflow: {
            nodes,
            connections,
            info: workflowInfo
        }
    }) => {
        // make a set of all nodeIds
        let compatibleNodes = new Set(Object.keys(nodes));

        // if the start node is a metanode then it means we're inside one, and any node
        // can be connected to the metanode port bar, so we skip bfs
        if (workflowInfo.containerType === 'metanode' && workflowInfo.containerId === startNode) {
            return compatibleNodes;
        }

        // do a breadth-first-search upstream / downstream
        // downstreamConnection means upstream bfs for circle detection
        let PORTS = [downstreamConnection ? 'inPorts' : 'outPorts'];
        let NODE = [downstreamConnection ? 'sourceNode' : 'destNode'];

        // start point for bfs
        let bfs = [startNode];

        while (bfs.length) {
            let nodeId = bfs.shift();

            // for each port according to search direction
            nodes[nodeId][PORTS].forEach(port => {
                // for all connections to / from that port
                port.connectedVia.forEach(connectionId => {
                    // add connected node to bfs
                    let nodeId = connections[connectionId][NODE];
                    if (compatibleNodes.has(nodeId)) {
                        bfs.push(nodeId);
                    }
                });
            });

            // every node that can be reached from startNode must not be connected to
            compatibleNodes.delete(nodeId);
        }

        return compatibleNodes;
    };

const checkConnectionSupport = ({ toPort, connections, targetPortDirection }) => {
    if (targetPortDirection === 'in') {
        const isPortFree = toPort.connectedVia.length === 0;

        if (isPortFree) {
            return true;
        }

        // In ports can only have 1 connection at a time
        const [connectionId] = toPort.connectedVia;

        // can be connected if the existing connection is deleteable
        return connections[connectionId].allowedActions.canDelete;
    }

    return true;
};

/**
 * Checks if two ports are compatible and might be connected
 * @param {Object} fromPort
 * @param {Object} toPort
 * @param {Array} availablePortTypes
 * @returns {boolean} if true the ports can be connected
 */
export const checkPortCompatibility = ({ fromPort, toPort, availablePortTypes }) => {
    const fromPortObjectInfo = toPortObject(availablePortTypes)(fromPort);
    const toPortObjectInfo = toPortObject(availablePortTypes)(toPort);
    const { compatibleTypes } = toPortObjectInfo;
    const { kind: fromPortKind } = fromPortObjectInfo;
    const { kind: toPortKind } = toPortObjectInfo;

    // 'generic' and 'table' port kinds are not compatible, so we check either direction
    if (
        (fromPortKind === 'generic' && toPortKind === 'table') ||
        (fromPortKind === 'table' && toPortKind === 'generic')
    ) {
        return false;
    }

    // generic ports accept any type of connection
    if (fromPortKind === 'generic' || toPortKind === 'generic') {
        return true;
    }

    // if compatible types exist, check if they contain each other
    if (compatibleTypes) {
        return compatibleTypes.includes(fromPort.typeId);
    }

    // lastly, if port types ids don't match then they can't be connected
    return fromPort.typeId === toPort.typeId;
};
// creates an array of [group, supportedPortTypes] entries even for metanodes and components (where the group is null)

const groupAddablePortTypesByPortGroup = ({
    targetPortGroups,
    availablePortTypes,
    targetPortDirection
}) => {
    // use all port types for metanodes and components (we assume them if portGroups is null!)
    if (!targetPortGroups) {
        return [[null, Object.keys(availablePortTypes)]]; // end here
    }

    // unwrap compatible port type by portGroup
    const portGroupEntries = Object.entries(targetPortGroups);
    const filterProp = targetPortDirection === 'in' ? 'canAddInPort' : 'canAddOutPort';
    const portGroupsForTargetDirection = portGroupEntries.filter(([_, portGroup]) => portGroup[filterProp]);

    return portGroupsForTargetDirection.map(([groupName, portGroup]) => [groupName, portGroup.supportedPortTypeIds]);
};

/**
 * Transforms array of portGroups and supportedPortTypes tuples to a valid portGroup object
 *
 * @param {[[string, string[]]]} groupArray - array with arrays of [portGroup, supportedPortTypeIds]
 * @param {string} canAddPortKey - either canAddInPort or canAddOutPort
 * @returns {Object.<string, Object>} returns an object with the portGroup as key and an object as value
 */
const transformToPortGroupObject = (groupArray, canAddPortKey) => Object.assign(
    ...groupArray.map(([groupName, supportedPortTypeIds]) => ({
        [groupName]: {
            [canAddPortKey]: true,
            supportedPortTypeIds
        }
    }))
);

/**
 * Checks for port compatibility and if it can be connected to that port (e.g. has this port already a connection)
 * @param {Object} fromPort
 * @param {Object} toPort
 * @param {Array} availablePortTypes
 * @param {('in'|'out')} targetPortDirection
 * @param {Array} connections
 * @returns {boolean}
 */
export const checkCompatibleConnectionAndPort = ({
    fromPort,
    toPort,
    availablePortTypes,
    targetPortDirection,
    connections
}) => {
    const isSupportedConnection = checkConnectionSupport({
        toPort,
        connections,
        targetPortDirection
    });

    const isCompatiblePort = checkPortCompatibility({
        fromPort,
        toPort,
        availablePortTypes
    });

    return isSupportedConnection && isCompatiblePort;
};

export const findTypeIdFromPlaceholderPort = ({
    fromPort,
    availablePortTypes,
    targetPortGroups,
    targetPortDirection
}) => {
    const addablePortTypesGrouped = groupAddablePortTypesByPortGroup({
        availablePortTypes,
        targetPortGroups,
        targetPortDirection
    });

    // only add the direct match in the supportedIds array
    const directMatches = addablePortTypesGrouped.flatMap(
        ([groupName, supportedIds]) => supportedIds.includes(fromPort.typeId)
            ? [[groupName || 'default', [fromPort.typeId]]]
            : []
    );
    const canAddPortKey = targetPortDirection === 'in' ? 'canAddInPort' : 'canAddOutPort';

    // case 1: direct matches
    if (directMatches.length > 0) {
        return {
            didSnap: true,
            createPortFromPlaceholder: { validPortGroups: transformToPortGroupObject(directMatches, canAddPortKey) }
        };
    }

    // case 2: compatible matches
    const compatibleMatches = addablePortTypesGrouped.flatMap(([group, supportedTypeIds]) => {
        const compatibleTypeIds = supportedTypeIds.filter(typeId => checkPortCompatibility({
            fromPort,
            toPort: { typeId },
            availablePortTypes
        }));
        return compatibleTypeIds.length > 0 ? [[group, compatibleTypeIds]] : [];
    });

    if (compatibleMatches.length > 0) {
        return {
            didSnap: true,
            createPortFromPlaceholder: { validPortGroups: transformToPortGroupObject(compatibleMatches, canAddPortKey) }
        };
    }

    // case 3: no match -> don't snap
    return { didSnap: false };
};
