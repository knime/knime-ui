import * as $shapes from '~/style/shapes';

// find nodes that are fully or partly inside the rectangle defined by startPos and endPos
export const findNodesInsideOfRectangle = ({ startPos, endPos, workflow }) => {
    let inside = [];
    let outside = [];
    Object.values(workflow.nodes).forEach(node => {
        const { nodeSize } = $shapes;
        let nodeIsInsideOfRectangle = false;
        if (node.position.x + nodeSize > startPos.x && node.position.x < endPos.x &&
            node.position.y + nodeSize > startPos.y && node.position.y < endPos.y) {
            nodeIsInsideOfRectangle = true;
        } else if (node.position.x < startPos.x && node.position.x + nodeSize > endPos.x &&
            node.position.y < startPos.y && node.position.y + nodeSize > endPos.y) {
            nodeIsInsideOfRectangle = true;
        } else if (node.position.x + nodeSize > startPos.x && node.position.x < endPos.x &&
            node.position.y < startPos.y && node.position.y + nodeSize > endPos.y) {
            nodeIsInsideOfRectangle = true;
        } else if (node.position.x < startPos.x && node.position.x + nodeSize > endPos.x &&
            node.position.y + nodeSize > startPos.y && node.position.y < endPos.y) {
            nodeIsInsideOfRectangle = true;
        }
        // create lists with node ids
        if (nodeIsInsideOfRectangle) {
            inside.push(node.id);
        } else {
            outside.push(node.id);
        }
    });
    return {
        inside,
        outside
    };
};
