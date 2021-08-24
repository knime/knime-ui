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
}

module.exports = KnimeHelper;
