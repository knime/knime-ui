const { validateEnum } = require('./util/validateEnum');

module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        if (validateEnum('sidebarMenu', providedLocator)) {
            locatorObj.value = `li[title="${providedLocator.sidebarMenu.css}"]`;
        }

        if (providedLocator.nodeCategoryTag) {
            locatorObj.value = `span[data-test-tag="${providedLocator.nodeCategoryTag}"]`;
        }
    });
};
