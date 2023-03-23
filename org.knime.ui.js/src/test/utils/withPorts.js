export const withPorts = (nodes, availablePortTypes) => nodes.map(node => ({
    ...node,
    inPorts: node.inPorts.map(port => ({
        ...port,
        ...availablePortTypes[port.typeId],
        type: availablePortTypes[port.typeId].kind
    })),
    outPorts: node.outPorts.map(port => ({
        ...port,
        ...availablePortTypes[port.typeId],
        type: availablePortTypes[port.typeId].kind
    })),
    dynInPorts: [],
    dynOutPorts: []
}));
