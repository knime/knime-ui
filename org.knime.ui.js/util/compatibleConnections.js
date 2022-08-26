/**
 * circleDetection returns all nodes that can be connected to startNode without closing a circle
 * @param {String} arg.startNode id of node in question
 * @param {Boolean} arg.downstreamConnection direction of intended connection
 * @param {Object} arg.workflow Workflow
 * @returns {Set<String>} returns a Set of nodes that startNode can be connected to
 */
export const circleDetection =
    ({ startNode, downstreamConnection, workflow: { nodes, connections, info: workflowInfo } }) => {
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
