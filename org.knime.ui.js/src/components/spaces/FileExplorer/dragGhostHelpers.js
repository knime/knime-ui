import { gsap } from 'gsap';
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';

const COLORS = {
    dragGhostContainer: {
        // TODO: create cornflower-ultra-light in webapps-common
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

/**
 * Creates the element that will be used to display the badge with the count of the total
 * selected items
 * @param {Object} param
 * @param {Number} count number to display in the badge
 * @returns {HTMLElement}
 */
const createGhostBadgeElement = ({ count }) => {
    const badge = document.createElement('div');
    // eslint-disable-next-line no-magic-numbers
    badge.innerText = count <= 99 ? count : '99+';
    badge.id = 'drag-ghost-badge';

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

/**
 * Uses an existing svg icon on the `target` element to use as icon for
 * the generated ghost. Returns null if no svg icon can be found in the target
 * @param {HTMLElement} target
 * @returns {HTMLElement | null} The icon element to add to the ghost
 */
const createGhostIcon = (target) => {
    const originalIcon = target.querySelector('svg');
    if (!originalIcon) {
        return null;
    }

    const iconEl = originalIcon.cloneNode(true);
    iconEl.style.width = '20px';
    iconEl.style.height = '20px';
    iconEl.style.marginRight = '10px';
    
    return iconEl;
};

/**
 * @typedef CreateGhostElementReturnType
 * @property {HTMLElement} ghost
 */
/**
 * Creates the element of the ghost
 * @param {Object} param
 * @param {String} param.textContent text to display in the ghost
 * @param {HTMLElement} param.target the element being ghosted. it's used to initally position the ghost on the same
 * coordinates
 * @param {Boolean} [param.addShadow] whether to add boxShadow styles to the ghost
 * @param {Number} [param.badgeCount] if specified, will add the badge with this value as a count
 * @returns {CreateGhostElementReturnType}
 */
const createGhostElement = ({ badgeCount, textContent, target, addShadow = false }) => {
    const TEXT_SIZE_THRESHOLD = 15;
    const ghost = document.createElement('div');
    ghost.innerText = textContent.length > TEXT_SIZE_THRESHOLD
        ? `${textContent.slice(0, TEXT_SIZE_THRESHOLD)}…`
        : textContent;
    ghost.setAttribute('data-id', 'drag-ghost');

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
        zIndex: 9,

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

    const iconEl = createGhostIcon(target);
    ghost.prepend(iconEl);

    if (badgeCount) {
        const badge = createGhostBadgeElement({ count: badgeCount });
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
    dragEvent.dataTransfer.dropEffect = 'move';
    dragEvent.dataTransfer.effectAllowed = 'move';
    dragEvent.dataTransfer.setDragImage(img, 0, 0);
};

/**
 * Returns a function to serve as an event handler to update the ghost's position
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
 * @typedef CreateDragGhostsReturnType
 * @property {Array<HTMLElement>} ghosts the added ghosts
 * @property {(animateOut: boolean) => void} removeGhosts a function to remove the ghost when needed. It receives a
 * parameter to determine whether to animate the removal of the ghosts (true by default)
 */
/**
 *  Creates the drag ghosts for the FileExplorer drag operations
 *
 * @param {Object} param
 * @param {DragEvent} param.dragStartEvent The DragStart event that originated the drag
 * @param {Number | Null} param.badgeCount Whether to display a badge with a count next to the ghost
 * @param {Array<{ textContent: String, targetEl: HTMLElement }>} param.selectedTargets targets that are selected
 * and for whom ghosts will be created
 * @param {HTMLElement} param.selectedTargets.targetEl element itself
 * @param {String} param.selectedTargets.textContent Text content to display in each ghost
 * @returns {CreateDragGhostsReturnType}
 */
export const createDragGhosts = ({
    dragStartEvent,
    badgeCount = null,
    selectedTargets
}) => {
    removeNativeDragGhost(dragStartEvent);

    // separate the first target and use it to create the badge
    const [firstTarget, ...otherTargets] = selectedTargets;
    const { ghost: firstGhost, badge } = createGhostElement({
        addShadow: true,
        textContent: firstTarget.textContent,
        badgeCount,
        target: firstTarget.targetEl
    });
    
    const ghosts = otherTargets.map(({ textContent, targetEl }, index) => {
        const { ghost } = createGhostElement({
            textContent,
            target: targetEl,
            // eslint-disable-next-line no-magic-numbers
            // Don't add shadows when there are more than 2 elements to ghost, since it makes the shadow too dark
            addShadow: index < 2
        });
        return { ghost, targetEl };
    });

    const allGhosts = [{ ghost: firstGhost, targetEl: firstTarget.targetEl }, ...ghosts];

    // add the ghosts to the document body so that they can be animated and positioned.
    // reverse them first to make sure the first ghost is added last and is displayed at the top
    allGhosts.reverse().forEach(({ ghost }) => {
        document.body.appendChild(ghost);
    });

    const ghostElements = allGhosts.map(({ ghost }) => ghost);
    
    const updatePosition = createGhostPositionUpdateHandler(ghostElements);

    document.addEventListener('drag', updatePosition);

    const removeGhosts = (animateOut = true) => {
        const removeGhost = ({ ghost }) => {
            if (!animateOut) {
                ghost.style.display = 'none';
            }
            document.body.removeChild(ghost);
            document.removeEventListener('drag', updatePosition);
        };

        document.getElementById('ghostNodePreview').style.display = 'none';

        if (!animateOut) {
            allGhosts.forEach(removeGhost);
            return;
        }

        allGhosts.forEach(({ ghost, targetEl }) => {
            const { x, y, width } = targetEl.getBoundingClientRect();
            if (badge) {
                // animate the disappeareance of the badge first
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
                    removeGhost({ ghost });
                    document.removeEventListener('drag', updatePosition);
                }
            });
        });
    };
    

    const replaceGhostPreview = ({ isAboveCanvas, nodePreview }) => {
        // TODO move out to helper function
        nodePreview.id = 'ghostNodePreview';

        if (isAboveCanvas) {
            document.removeEventListener('drag', updatePosition);
               
            // document.getElementById('ghostNodePreview').style.display = 'flex';
            nodePreview.style.display = 'flex';
            document.addEventListener('drag', (event) => {
                // TODO change offset
                nodePreview.style.left = event.clientX - 35;
                nodePreview.style.top = event.clientY - 35;
            });
            allGhosts.forEach(({ ghost }) => {
                ghost.style.display = 'none';
            });
        } else {
            document.addEventListener('drag', updatePosition);
            nodePreview.style.display = 'none';

            allGhosts.forEach(({ ghost }) => {
                ghost.style.display = 'flex';
            });
        }
    };

    return { ghosts: ghostElements, removeGhosts, replaceGhostPreview };
};
