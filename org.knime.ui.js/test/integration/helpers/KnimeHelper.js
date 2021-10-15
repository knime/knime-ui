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
        const elem = await page.$(selector);
        const boundingBox = await elem.boundingBox();
        // it centers mouse on the middle of the element
        await page.mouse.move(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
        );
        page.mouse.wheel({ deltaY: value });
    }
}

module.exports = KnimeHelper;
