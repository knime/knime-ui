export const DIRECTIONS = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

const MIN_DIMENSIONS = { width: 40, height: 40 };

const directionHandlers = {
    // north-west
    nw: (currentBounds, { deltaX, deltaY, direction }) => ({
        ...currentBounds,
        x: currentBounds.x + deltaX,
        y: currentBounds.y + deltaY,

        width: currentBounds.width + deltaX * -1,
        height: currentBounds.height + deltaY * -1
    }),

    // north
    n: (currentBounds, { deltaY, direction }) => ({
        ...currentBounds,
        y: currentBounds.y + deltaY,

        height: currentBounds.height + deltaY * -1
    }),

    // north-east
    ne: (currentBounds, { deltaX, deltaY, direction }) => ({
        ...currentBounds,
        y: currentBounds.y + deltaY,

        width: currentBounds.width + deltaX,
        height: currentBounds.height + deltaY * -1
    }),

    // west
    w: (currentBounds, { deltaX, direction }) => ({
        ...currentBounds,
        x: currentBounds.x + deltaX,

        width: currentBounds.width + deltaX * -1
    }),

    // east
    e: (currentBounds, { deltaX, direction }) => ({
        ...currentBounds,
        width: currentBounds.width + deltaX
    }),

    // south-west
    sw: (currentBounds, { deltaX, deltaY, direction }) => ({
        ...currentBounds,
        x: currentBounds.x + deltaX,

        width: currentBounds.width + deltaX * -1,
        height: currentBounds.height + deltaY
    }),

    // south
    s: (currentBounds, { deltaY, direction }) => ({
        ...currentBounds,
        height: currentBounds.height + deltaY
    }),

    // south-east
    se: (currentBounds, { deltaX, deltaY, direction }) => ({
        ...currentBounds,
        width: currentBounds.width + deltaX,
        height: currentBounds.height + deltaY
    })
    
};

export const getNewBounds = (currentBounds, { startX, startY, moveX, moveY, direction }) => {
    const deltaX = moveX - startX;
    const deltaY = moveY - startY;
    
    const defaultHandler = () => currentBounds;
    const directionHandler = directionHandlers[direction] || defaultHandler;
    const newBounds = directionHandler(currentBounds, { deltaX, deltaY, direction });
    return newBounds.width <= MIN_DIMENSIONS.width || newBounds.height < MIN_DIMENSIONS.height
        ? currentBounds
        : newBounds;
};
