const KnimeHelper = require('./KnimeHelper');
const { _getCenterNode, _getNodeSelector } = require('./util/KnimeNodeUtil');
const { _getModifierKey } = require('./util/osUtil');

class KnimeNode extends KnimeHelper {
    /**
    * Hover an specific Node in the workflow.
    * @param {String} selector The ID of the Node to hover.
    */
    async hover(selector) {
        const page = await this._getPage();
        const nodeSelector = _getNodeSelector(selector);
        await page.hover(nodeSelector);
    }

    /**
    * Select an specific Node in the workflow.
    * @param {String} selector The ID of the Node to select.
    */
    async selectNode(selector) {
        const page = await this._getPage();
        const nodeCoordinates = await _getCenterNode(selector, page);
        await page.mouse.click(nodeCoordinates.x, nodeCoordinates.y, {
            clickCount: 1,
            button: 'left'
        });
    }

    /**
    * Double click an specific Node in the workflow.
    * @param {String} selector The ID of the Node to left-click twice.
    */
    async doubleClickNode(selector) {
        const page = await this._getPage();
        const nodeCoordinates = await _getCenterNode(selector, page);
        // Adding selectNode() to support different resolutions. Sometimes, the node
        // is not on screen. Also, creating different method because it's going to be useful
        // for future cases.
        await this.selectNode(selector);
        await page.mouse.click(nodeCoordinates.x, nodeCoordinates.y, {
            clickCount: 2,
            delay: 100,
            button: 'left'
        });
    }

    /**
     * Double click an specific Node while pressing Ctrl key.
     * @param {String} selector The ID of the Node to click twice while pressing Ctrl.
     */
    async doubleClickNodeWithCtrl(selector) {
        const page = await this._getPage();
        const modifierKey = _getModifierKey();

        await page.keyboard.down(modifierKey);
        await this.doubleClickNode(selector);
        await page.keyboard.down(modifierKey);
    }
}

module.exports = KnimeNode;
