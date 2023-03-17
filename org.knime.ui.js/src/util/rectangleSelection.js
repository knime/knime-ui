import * as $shapes from '@/style/shapes.mjs';

// find nodes that are fully or partly inside the rectangle defined by startPos and endPos
export const findItemsInsideOfRectangle = ({ startPos, endPos, workflow }) => {
    // normalize rectangle
    let rectangle = {
        x1: Math.min(startPos.x, endPos.x),
        y1: Math.min(startPos.y, endPos.y),
        x2: Math.max(startPos.x, endPos.x),
        y2: Math.max(startPos.y, endPos.y)
    };

    // divide nodes
    let nodesInside = [];
    let nodesOutside = [];
    Object.values(workflow.nodes).forEach(({ position, id }) => {
        const { nodeSize } = $shapes;

        // [left rectangle edge] left from [right node edge] && [right rectangle edge] right from [left node edge]
        let xInside = (rectangle.x1 <= position.x + nodeSize) && (rectangle.x2 >= position.x);
        let yInside = (rectangle.y1 <= position.y + nodeSize) && (rectangle.y2 >= position.y);

        // create lists with node ids
        if (xInside && yInside) {
            nodesInside.push(id);
        } else {
            nodesOutside.push(id);
        }
    });

    // divide annotations
    let annotationsInside = [];
    let annotationsOutside = [];
    Object.values(workflow.workflowAnnotations).forEach(({ bounds, id }) => {
        // [left rectangle edge] left from [right annotation edge] && [right rectangle edge] right from [left annotation edge]
        let xInside = (rectangle.x1 <= bounds.x + bounds.width) && (rectangle.x2 >= bounds.x);
        let yInside = (rectangle.y1 <= bounds.y + bounds.height) && (rectangle.y2 >= bounds.y);
    
        // create lists with node ids
        if (xInside && yInside) {
            annotationsInside.push(id);
        } else {
            annotationsOutside.push(id);
        }
    });
        
    return {
        nodesInside,
        nodesOutside,
        annotationsInside,
        annotationsOutside
    };
};
