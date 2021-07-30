const { validateEnum } = require('./util/valideEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (providedLocator.nodeId) {
            locatorObj.type = 'css';
            locatorObj.value = `[data-node-id="root:${providedLocator.nodeId}"] `;

            if (validateEnum('state', providedLocator)) {
                locatorObj.value += providedLocator.state.css;
            }

            if (validateEnum('decorator', providedLocator)) {
                locatorObj.value += providedLocator.decorator.css;
            }

            if (validateEnum('misc', providedLocator)) {
                locatorObj.value += providedLocator.misc.css;
            }
        }
    });
};
