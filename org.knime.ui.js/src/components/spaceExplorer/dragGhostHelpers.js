import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';

const COLORS = {
    dragGhostContainer: {
        background: knimeColors.CornflowerDark,
        font: knimeColors.White
    },
    dragGhostBadge: {
        background: knimeColors.Masala,
        font: knimeColors.White
    }
};

/**
 * Apply styles to given element
 * @param {HTMLElement} element
 * @param {CSSStyleDeclaration} styles
 * @returns {void}
 */
const applyStyles = (element, styles) => {
    Object.entries(styles).forEach(([property, value]) => {
        element.style[property] = value;
    });
};

const createGhostBadge = ({ count }) => {
    const badge = document.createElement('div');
    // eslint-disable-next-line no-magic-numbers
    badge.innerText = count <= 99 ? count : '99+';

    /**
     * @type {CSSStyleDeclaration}
     */
    const badgeStyles = {
        background: COLORS.dragGhostBadge.background,
        color: COLORS.dragGhostBadge.font,
        fontSize: '13px',
        lineHeight: '11px',
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        right: '-10px',
        top: '-10px',
        borderRadius: '50%',
        width: '30px',
        height: '30px',
        padding: '5px',
        pointerEvents: 'none'
    };

    applyStyles(badge, badgeStyles);

    return badge;
};

const createGhostContainer = ({ badgeCount, textContent, event }) => {
    const ghost = document.createElement('div');
    ghost.innerText = textContent;

    const { x, y, width, height } = event.target.getBoundingClientRect();

    /**
     * @type {CSSStyleDeclaration}
     */
    const ghostStyles = {
        background: COLORS.dragGhostContainer.background,
        color: COLORS.dragGhostContainer.font,
        
        // use the original drag target's position to initialize the ghost
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        width: `${width}px`,
        height: `${height}px`,

        // make sure the ghost doesn't interfere with the drag
        pointerEvents: 'none',

        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '0 12px',
        borderRadius: '4px',
        opacity: 1
        
        // boxShadow: badgeCount && `
        //     0 1px 1px rgba(0,0,0,0.15),
        //     0 8px 0 -5px var(--knime-cornflower),
        //     0 8px 1px -4px rgba(0,0,0,0.15)
        // `
    };

    applyStyles(ghost, ghostStyles);

    if (badgeCount) {
        const badge = createGhostBadge({ count: badgeCount });
        ghost.appendChild(badge);
    }

    return ghost;
};

/**
 * Removes the browser native drag ghost by replacing it with a transparent image
 * @param {DragEvent} dragEvent
 * @returns {void}
 */
const removeNativeDragGhost = (dragEvent) => {
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    dragEvent.dataTransfer.setDragImage(img, 0, 0);
};

/**
 * Returns an a function to serve as an event handler to update the ghost's position
 * @param {HTMLElement} ghost
 * @returns {Function}
 */
const createGhostPositionUpdateHandler = (ghost) => ({ clientX, clientY }) => {
    if (clientX === 0 && clientY === 0) {
        return;
    }

    ghost.style.left = `${clientX}px`;
    ghost.style.top = `${clientY}px`;
};

/**
 * Animates the ghost appearing. Returns a promise that resolves when the animation is complete
 * @param {Object} param
 * @param {HTMLElement} param.ghost
 * @param {DragEvent} param.dragStartEvent
 * @returns {Promise}
 */
const animateIn = ({ ghost, dragStartEvent }) => new Promise(async resolve => {
    const SLEEP_MS = 50;
    
    // apply temporary transition
    ghost.style.transition = 'all 0.05s';

    // move ghost to where the mouse position is based on the drag event
    requestAnimationFrame(() => {
        ghost.style.left = `${dragStartEvent.clientX}px`;
        ghost.style.top = `${dragStartEvent.clientY}px`;
        
        // reduce ghost size
        ghost.style.width = '200px';
    });

    // wait a small time to let transitions play out
    await new Promise(r => setTimeout(r, SLEEP_MS));
    
    // reset transition style so that ghost can be dragged without delays
    ghost.style.transition = `none`;
    
    resolve();
});

/**
 * @typedef CreateGhostResponse
 * @property {HTMLElement} ghost the ghost element
 * @property {Function} removeGhost a function to remove the ghost when needed
 */
/**
 *  Creates the drag ghost for the FileExplorer drag operations
 *
 * @param {Object} param
 * @param {String} param.textContent Text to display inside ghost
 * @param {DragEvent} param.dragStartEvent The DragStart event that originated the drag
 * @param {Number | Null} param.badgeCount Whether to display a badge with a count next to the ghost
 * @returns {CreateGhostResponse}
 */
export const createDragGhost = ({
    textContent,
    dragStartEvent,
    badgeCount = null
}) => {
    removeNativeDragGhost(dragStartEvent);

    const { target } = dragStartEvent;

    const ghost = createGhostContainer({ textContent, badgeCount, event: dragStartEvent });

    // add the ghost to body so that it can be animated later
    document.body.appendChild(ghost);
    
    const updatePosition = createGhostPositionUpdateHandler(ghost);

    animateIn({ ghost, dragStartEvent }).then(() => {
        document.addEventListener('drag', updatePosition);
    });

    const removeGhost = () => {
        const EXIT_TRANSITION_TIME_MS = 200;
        
        const { x, y } = target.getBoundingClientRect();
        ghost.style.transition = `all ${EXIT_TRANSITION_TIME_MS}ms`;
        ghost.style.left = `${x}px`;
        ghost.style.top = `${y}px`;
        ghost.style.opacity = '0';

        setTimeout(() => {
            document.body.removeChild(ghost);
            document.removeEventListener('drag', updatePosition);
        }, EXIT_TRANSITION_TIME_MS);
    };
    
    return { ghost, removeGhost };
};
