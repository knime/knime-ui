module.exports = () => {
    codeceptjs.locator.addFilter((providedLocator, locatorObj) => {
        /**
        * Breadcrumb Child starts at index 1.
        * Example: If you want to go back to main view, you should use '1'.
        */
        if (providedLocator.breadcrumbChild) {
            locatorObj.value = `#toolbar > nav > ul > li:nth-child(${providedLocator.breadcrumbChild})`;
        }
    });
};
