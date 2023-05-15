import * as $shapes from '@/style/shapes.mjs';

// find nodes that are fully or partly inside the rectangle defined by startPos and endPos
export const findItemsInsideOfRectangle = ({ startPos, endPos, workflow }) => {
    // normalize rectangle
    let rectangle = {
        x1: Math.min(startPos.x, endPos.x), // x left
        y1: Math.min(startPos.y, endPos.y), // y top
        x2: Math.max(startPos.x, endPos.x), // x right
        y2: Math.max(startPos.y, endPos.y) // y bottom
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
        let annotationX1 = bounds.x; // x left
        let annotationX2 = bounds.x + bounds.width; // x right
        let annotationY1 = bounds.y; // y top
        let annotationY2 = bounds.y + bounds.height; // y bottom

        let startedFromInside = (annotationX1 <= rectangle.x1) && (annotationX2 >= rectangle.x2) &&
        (annotationY1 <= rectangle.y1) && (annotationY2 >= rectangle.y2);
        let xInside = (rectangle.x1 <= annotationX2) && (rectangle.x2 >= annotationX1);
        let yInside = (rectangle.y1 <= annotationY2) && (rectangle.y2 >= annotationY1);
    
        // create lists with annotation ids
        if (xInside && yInside && !startedFromInside) {
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
