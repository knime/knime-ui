import * as $shapes from '@/style/shapes.mjs';

const {
    nodeSize, nodeNameMargin, nodeStatusMarginTop, nodeStatusHeight, nodeNameLineHeight, portSize,
    defaultMetanodeBarPosition, defaultMetaNodeBarHeight, metaNodeBarWidth, horizontalNodePadding
} = $shapes;

export const nodePadding = {
    top: nodeNameMargin + nodeNameLineHeight,
    bottom: nodeStatusMarginTop + nodeStatusHeight,
    left: horizontalNodePadding,
    right: horizontalNodePadding
};

export default ({
    nodes = {},
    workflowAnnotations = [],
    metaInPorts = null,
    metaOutPorts = null
}, { padding = false } = {}) => {
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    // To create the bounds of the workflow:

    // 1. Look for the outermost `left`, `top, `right`, and `bottom` values when considering
    // all the existing nodes and their positions
    Object.values(nodes).forEach(({ position: { x, y } }) => {
        const nodeTop = y - (padding ? nodePadding.top : 0);
        const nodeBottom = y + nodeSize + (padding ? nodePadding.bottom : 0);
        const nodeLeft = x - (padding ? nodePadding.left : 0);
        const nodeRight = x + nodeSize + (padding ? nodePadding.right : 0);

        left = Math.min(left, nodeLeft);
        top = Math.min(top, nodeTop);
        right = Math.max(right, nodeRight);
        bottom = Math.max(bottom, nodeBottom);
    });

    // 2. Also account for annotations
    workflowAnnotations.forEach(({ bounds: { x, y, height, width } }) => {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + width);
        bottom = Math.max(bottom, y + height);
    });

    // there are neither nodes nor workflows annotations
    if (left === Infinity) {
        left = 0;
        top = 0;
        right = 0;
        bottom = 0;
    }

    const hasNodes = Object.keys(nodes).length !== 0;
    const isMetanode = Boolean(metaInPorts || metaOutPorts);
    const hasMetaInPorts = metaInPorts?.ports?.length > 0;
    const hasMetaOutPorts = metaOutPorts?.ports?.length > 0;
    if (!hasNodes && isMetanode && (hasMetaInPorts || hasMetaOutPorts)) {
        return {
            left,
            top,
            right,
            bottom,
            width: right - left,
            height: bottom - top
        };
    }

    // Consider horizontal position of metanode input / output bars.
    // The logic is as follows:
    // - if a user has moved an input / output bar, then its x-position is taken as saved.
    // - else
    //   - input bar
    //     - if the workflow contents extend to a negative coordinate, render the bar left of the workflow contents
    //     - else render it at 0.
    //   - output bar
    //     - if the view is wide enough, the output bar is rendered at a fixed position
    //     - else (horizontal overflow), the output bar is drawn to the right of the workflow contents.
    //
    // The vertical dimensions are always equal to the workflow dimensions, unless the workflow is empty,
    // in which case they get a default height.

    let defaultBarPosition = defaultMetanodeBarPosition;
    if (metaInPorts?.ports?.length) {
        let leftBorder, rightBorder;
        if (metaInPorts.xPos) {
            leftBorder = metaInPorts.xPos - metaNodeBarWidth;
            rightBorder = metaInPorts.xPos + portSize;
        } else {
            leftBorder = Math.min(0, left) - metaNodeBarWidth;
            rightBorder = leftBorder + metaNodeBarWidth + portSize;
        }
        if (leftBorder < left) {
            left = leftBorder;
        }
        if (rightBorder > right) {
            right = rightBorder;
        }
    }

    if (metaOutPorts?.ports?.length) {
        let leftBorder, rightBorder;
        if (metaOutPorts.xPos) {
            leftBorder = metaOutPorts.xPos - portSize;
            rightBorder = metaOutPorts.xPos + metaNodeBarWidth;
        } else {
            leftBorder = left + defaultBarPosition - portSize;
            rightBorder = leftBorder + metaNodeBarWidth + portSize;
        }
        if (leftBorder < left) {
            left = leftBorder;
        }
        if (rightBorder > right) {
            right = rightBorder;
        }
    }

    if (metaInPorts?.ports?.length || metaOutPorts?.ports?.length) {
        if (bottom < Math.min(0, top) + defaultMetaNodeBarHeight) {
            bottom = Math.min(0, top) + defaultMetaNodeBarHeight;
        }
    }

    return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top
    };
};
