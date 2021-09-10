const Helper = require('@codeceptjs/helper');

class KnimeHelper extends Helper {
    /**
    * Get page instance from Puppeteer.
    */
    async _getPage() {
        const page = await this.helpers.Puppeteer.page;
        return page;
    }
}

module.exports = KnimeHelper;
