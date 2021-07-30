const locators = require('../locators');

// Agregar Jsdoics
const validateEnum = (enumName, providedLocator) => {
    if (!locators.hasOwnProperty(enumName)) {
        throw new Error(`Invalid enum value ${enumName}. Valid enums are ${Object.keys(locators)}`);
    }

    if (!providedLocator.hasOwnProperty(enumName)) {
        return false;
    }

    const enumLocator = locators[enumName];
    const enumValue = providedLocator[enumName];

    for (const key in enumLocator) {
        if (Object.hasOwnProperty.call(enumLocator, key)) {
            const element = enumLocator[key];
            if (element === enumValue) {
                return true;
            }
        }
    }
    throw new Error(`Invalid enum value ${enumValue} for ${enumName}. Valid values are: ${Object.keys(enumLocator)}`);
};

module.exports = {
    validateEnum
};
