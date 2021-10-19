export const circleDetection = ({ startNode, direction, workflow: { nodes, connections } }) => {
    // make a set of all nodeIds
    let compatibleNodes = new Set(Object.keys(nodes));

    // do a breadth-first-search upstream / downstream
    let upstream = direction === 'out';
    let PORTS = [upstream ? 'inPorts' : 'outPorts'];
    let NODE = [upstream ? 'sourceNode' : 'destNode'];

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

        // delete nodeId from set
        compatibleNodes.delete(nodeId);
    }

    return compatibleNodes;
};

