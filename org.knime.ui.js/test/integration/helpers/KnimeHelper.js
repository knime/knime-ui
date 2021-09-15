const Helper = require('@codeceptjs/helper');

class KnimeHelper extends Helper {
    /**
    * Get page instance from Puppeteer.
    */
    async _getPage() {
        const page = await this.helpers.Puppeteer.page;
        return page;
    }

    /**
    * Drop down mouse left click.
    */
    async dropMouse() {
        const page = await this._getPage();
        await page.mouse.up();
    }

    /**
    * Scrolls to element matched by locator.
    * @param {String} selector The element selector to scroll.
    * @param {Number} value units to scroll (it can be negative).
    */
    async scroll(selector, value) {
        const page = await this._getPage();
        await page.evaluate((selector, value) => {
            const scrollableSection = document.querySelector(selector);
            scrollableSection.scrollTop += value;
        }, selector, value);
    }
}

module.exports = KnimeHelper;
