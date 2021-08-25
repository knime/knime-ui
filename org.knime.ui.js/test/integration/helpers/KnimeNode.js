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
        await page.keyboard.up(modifierKey);
    }

    /**
     * Move a node.
     * @param {String} selector The ID of the Node to move.
     * @param {Number} x units to move horizontally.
     * @param {Number} y units to move vertically.
     */
    async moveNode(selector, x, y) {
        await this.draggingNode(selector, x, y);
        await this.dropMouse();
    }

    /**
     * Drag a node.
     * @param {String} selector The ID of the Node to drag.
     * @param {Number} x units to drag horizontally.
     * @param {Number} y units to drag vertically.
     */
    async draggingNode(selector, x, y) {
        const page = await this._getPage();
        const nodeCoordinates = await _getCenterNode(selector, page);

        await page.mouse.move(nodeCoordinates.x, nodeCoordinates.y, { steps: 5 });
        await page.mouse.down();

        await page.mouse.move(nodeCoordinates.x + x, nodeCoordinates.y + y, { steps: 5 });
    }

    /**
     * Select a set of nodes.
     * @param {Object} Selectors - The ID of the Nodes to drag.
     */
    async selectMultipleNodes(...selectors) {
        if (selectors.length === 0) {
            throw new Error('No nodes selected');
        } else {
            const page = await this._getPage();
            await page.keyboard.down('Shift');

            for (let i = 0; i < selectors.length; i++) {
                await this.selectNode(selectors[i]);
            }
            await page.keyboard.up('Shift');
        }
    }

    /**
     * Move a set of nodes.
     * @param {Number} x units to move horizontally.
     * @param {Number} y units to move vertically.
     * @param {Object} Nodes - The ID of the Nodes to move.
     */
    async moveMultipleNodesWithShift(x, y, ...selectors) {
        await this.selectMultipleNodes(...selectors);
        await this.moveNode(selectors[0], x, y);
    }
    

    /**
     * Grab the current node position.
     * @param {String} selector The ID of the Node to move.
     * @returns {Object} X and Y coordinates from transform attribute.
     */
    async grabNodePosition(selector) {
        const page = await this._getPage();
        const nodeSelector = _getNodeSelector(selector);
        const attr = await page.$$eval(nodeSelector, el => el.map(x => x.getAttribute('transform')));
        const getNumbersRegex = /-?\d+/g;
        const numbers = attr[0].match(getNumbersRegex);
        const x = parseInt(numbers[0], 10);
        const y = parseInt(numbers[1], 10);

        return { x, y };
    }
}

module.exports = KnimeNode;
