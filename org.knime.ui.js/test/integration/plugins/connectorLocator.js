const getConnectorSelector = (sourceNode, targetNode) => {
    let selector = `[data-test-source-node="root:${sourceNode}"]`;
    selector += `[data-test-dest-node="root:${targetNode}"]`;
    return selector;
};

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (providedLocator.sourceNode && providedLocator.destNode) {
            locatorObj.value = getConnectorSelector(providedLocator.sourceNode, providedLocator.destNode);
        }
    });
};
