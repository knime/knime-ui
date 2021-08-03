const { validateEnum } = require('./util/validateEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (validateEnum('action', providedLocator)) {
            locatorObj.value = providedLocator.action.css;
        }
    });
};
