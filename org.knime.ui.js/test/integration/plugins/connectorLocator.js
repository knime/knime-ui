const getConnectorSelector = (sourceNode, targetNode) => {
    let selector = `[data-source-node="root:${sourceNode}"]`;
    selector += `[data-dest-node="root:${targetNode}"]`;
    return selector;
};

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (providedLocator.sourceNode && providedLocator.destNode) {
            locatorObj.value = getConnectorSelector(providedLocator.sourceNode, providedLocator.destNode);
        }
    });
};
