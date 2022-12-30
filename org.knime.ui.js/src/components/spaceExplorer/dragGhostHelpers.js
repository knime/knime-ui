import { gsap } from 'gsap';
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';

const COLORS = {
    dragGhostContainer: {
        // TODO: create cornflower-ultra-light in WAC
        background: 'hsl(206deg 74% 90%/100%)',
        font: knimeColors.Masala
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

const createGhostContainer = ({ badgeCount, textContent, target, addShadow = false }) => {
    const ghost = document.createElement('div');
    ghost.innerText = textContent;

    const { x, y, width, height } = target.getBoundingClientRect();

    /**
     * @type {CSSStyleDeclaration}
     */
    const ghostStyles = {
        background: COLORS.dragGhostContainer.background,
        color: COLORS.dragGhostContainer.font,
        
        // use the original target's position to initialize the ghost
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
        opacity: 1,
        boxShadow: addShadow && '0px 2px 10px rgba(130, 133, 134, 0.4)'
    };

    applyStyles(ghost, ghostStyles);

    if (badgeCount) {
        const badge = createGhostBadge({ count: badgeCount });
        ghost.appendChild(badge);
        return { ghost, badge };
    }

    return { ghost };
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
 * @param {Array<HTMLElement>} ghosts
 * @returns {Function}
 */
const createGhostPositionUpdateHandler = (ghosts) => ({ clientX, clientY }) => {
    if (clientX === 0 && clientY === 0) {
        return;
    }
    
    ghosts.forEach(g => {
        gsap.to(g, {
            left: clientX,
            top: clientY,
            width: '200px',
            duration: 0.35
        });
    });
};

/**
 * @typedef CreateGhostResponse
 * @property {HTMLElement} ghost the ghost element
 * @property {Function} removeGhost a function to remove the ghost when needed
 */
/**
 *  Creates the drag ghost for the FileExplorer drag operations
 *
 * @param {Object} param
 * @param {DragEvent} param.dragStartEvent The DragStart event that originated the drag
 * @param {Number | Null} param.badgeCount Whether to display a badge with a count next to the ghost
 * @param {Object} param.selectedTargets targets that are selected and for whom ghosts will be created
 * @param {HTMLElement} param.selectedTargets.targetEl element itself
 * @param {String} param.selectedTargets.textContent Text content to display in each ghost
 * @returns {CreateGhostResponse}
 */
export const createDragGhost = ({
    dragStartEvent,
    badgeCount = null,
    selectedTargets
}) => {
    removeNativeDragGhost(dragStartEvent);

    // separate the first target and use it to create the badge
    const [firstTarget, ...otherTargets] = selectedTargets;
    const { ghost: firstGhost, badge } = createGhostContainer({
        addShadow: true,
        textContent: firstTarget.textContent,
        badgeCount,
        target: firstTarget.targetEl
    });
    
    const ghosts = otherTargets.map(({ textContent, targetEl }, index) => {
        const { ghost } = createGhostContainer({
            textContent,
            target: targetEl,
            // eslint-disable-next-line no-magic-numbers
            addShadow: index < 3
        });
        return { ghost, targetEl };
    });

    const allGhosts = [{ ghost: firstGhost, targetEl: firstTarget.targetEl }, ...ghosts];

    // add the ghosts to the document body so that they can be animated and positioned.
    // reverse them first to make sure the first ghost is added last and is displayed at the top
    allGhosts.reverse().forEach(({ ghost }) => {
        document.body.appendChild(ghost);
    });
    
    const updatePosition = createGhostPositionUpdateHandler(allGhosts.map(({ ghost }) => ghost));

    document.addEventListener('drag', updatePosition);

    const removeGhost = () => {
        allGhosts.forEach(({ ghost, targetEl }) => {
            const { x, y, width } = targetEl.getBoundingClientRect();
            if (badge) {
                gsap.to(badge, {
                    autoAlpha: 0,
                    duration: 0.05,
                    onComplete: () => {
                        gsap.killTweensOf(badge);
                    }
                });
            }

            gsap.to(ghost, {
                left: x,
                top: y,
                width,
                duration: 0.2,
                onComplete: () => {
                    gsap.killTweensOf(ghost);
                    document.body.removeChild(ghost);
                    document.removeEventListener('drag', updatePosition);
                }
            });
        });
    };
    
    return { removeGhost };
};
