// in this file you can append custom step methods to 'I' object

module.exports = function () {
    // eslint-disable-next-line no-undef
    return actor({

        // Define custom steps here, use 'this' to access default methods of I.
        // It is recommended to place a general 'login' function here.

        /**
        * Assert an element exists and does contain the 'disabled' class
        * @param {String} selector Element selector.
        * @param {String} attribute Attribute selector. Options are: 'class' or 'disabled'.
        */
        async seeElementAndDisabled(selector, attribute) {
            this.seeElement(selector);

            const elementAttribute = await this.grabAttributeFrom(selector, attribute);
            // console.log(elementAttribute);
            if (attribute === 'class') {
                console.log(elementAttribute);
                this.assertStringIncludes(elementAttribute, 'disabled');
            }

            if (attribute === 'disabled') {
                this.assertOk(elementAttribute === true, `Asserting if ${JSON.stringify(selector)} is enabled`);
            }
        },
        
        /**
        * Assert an element exists and does not contain the 'disabled' class
        * @param {String} selector Element selector.
        * @param {String} attribute Attribute selector. Options are: 'class' or 'disabled'.
        */
        async seeElementAndEnabled(selector, attribute) {
            this.seeElement(selector);

            const elementAttribute = await this.grabAttributeFrom(selector, attribute);
            // console.log(elementAttribute);
            if (attribute === 'class') {
                const isDisabled = elementAttribute.includes('disabled');
                this.assertOk(isDisabled === false, `Asserting if ${JSON.stringify(selector)} is enabled`);
            }
            if (attribute === 'disabled') {
                this.assertOk(elementAttribute !== true, `Asserting if ${JSON.stringify(selector)} is enabled`);
            }
        }
    });
};
