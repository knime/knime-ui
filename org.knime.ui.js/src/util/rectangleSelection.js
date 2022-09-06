import * as $shapes from '@/style/shapes.mjs';

// find nodes that are fully or partly inside the rectangle defined by startPos and endPos
export const findNodesInsideOfRectangle = ({ startPos, endPos, workflow }) => {
    // normalize rectangle
    let rectangle = {
        x1: Math.min(startPos.x, endPos.x),
        y1: Math.min(startPos.y, endPos.y),
        x2: Math.max(startPos.x, endPos.x),
        y2: Math.max(startPos.y, endPos.y)
    };

    // divide nodes
    let inside = [];
    let outside = [];
    Object.values(workflow.nodes).forEach(({ position, id }) => {
        const { nodeSize } = $shapes;

        // [left rectanlge edge] left from [right node edge] && [right rectangle edge] right from [left node edge]
        let xInside = (rectangle.x1 <= position.x + nodeSize) && (rectangle.x2 >= position.x);
        let yInside = (rectangle.y1 <= position.y + nodeSize) && (rectangle.y2 >= position.y);

        // create lists with node ids
        if (xInside && yInside) {
            inside.push(id);
        } else {
            outside.push(id);
        }
    });

    return {
        inside,
        outside
    };
};
