import { areaCoverage } from '@/util/geometry';
import { findFreeSpace } from '@/util/findFreeSpaceOnCanvas';

const visibilityThreshold = 0.7;

/**
 * find free space for clipboard objects
 * @param { Number } position.left x position to start looking from
 * @param { Number } position.left y position to start looking from
 * @returns { Object } free space position and visibility of the area, if pasted there
 */
const findFreeSpaceFrom = ({ clipboardContent, nodes, visibleFrame }) => ({ left, top }) => {
    let position = findFreeSpace({ // eslint-disable-line implicit-arrow-linebreak
        area: clipboardContent.objectBounds,
        workflow: { nodes },
        startPosition: {
            x: left,
            y: top
        },
        step: {
            x: 120,
            y: 120
        }
    });
    
    let visibility = areaCoverage({
        left: position.x,
        top: position.y,
        width: clipboardContent.objectBounds.width,
        height: clipboardContent.objectBounds.height
    }, visibleFrame);

    return {
        ...position,
        visibility
    };
};

/**
 * Tries to fit clipboard objects beginning at the screen's center
 * If no free space is found within the canvas's border, it will be pasted directly at center
 * @returns { Object } x and y position
 */
const centerStrategy = ({ visibleFrame, clipboardContent, nodes }) => {
    const centerX = (visibleFrame.left + visibleFrame.width / 2) -
        (clipboardContent.objectBounds.width / 2);
    
    const eyePleasingVerticalOffset = 0.75;
    const centerY = visibleFrame.top + (visibleFrame.height / 2 * eyePleasingVerticalOffset) -
        (clipboardContent.objectBounds.height / 2);

    let offsetX = 0;
    do {
        let fromCenter = findFreeSpaceFrom({ visibleFrame, clipboardContent, nodes })({
            left: centerX + offsetX,
            top: centerY
        });
    
        if (fromCenter.visibility >= visibilityThreshold) {
            consola.info('found free space around center');
            return fromCenter;
        }

        // eslint-disable-next-line no-magic-numbers
        offsetX += 120;
    } while (offsetX < visibleFrame.right);

    consola.info('no free space found around center');
    return {
        x: centerX + Math.random() * clipboardContent.objectBounds.width,
        y: centerY + Math.random() * clipboardContent.objectBounds.height
    };
};

/**
 * Tries to fit clipboard objects beginning at it's original position
 * If no free space is found within the canvas' borders, it returns null
 * @returns { Object | null } x and y position
 */
const originStrategy = ({ clipboardContent, nodes, visibleFrame }) => {
    let fromOrigin = findFreeSpaceFrom({ clipboardContent, nodes, visibleFrame })(clipboardContent.objectBounds);

    if (fromOrigin.visibility >= visibilityThreshold) {
        consola.info('found free space with origin strategy');
        return fromOrigin;
    }
    consola.info('no free space found with origin strategy');
    return null;
};

/*
 * returns position and what to do after pasting
*/
export const pastePartsAt = ({ visibleFrame, clipboardContent, workflow, isWorkflowEmpty, copyPaste, dispatch }) => {
    const { nodes, projectId, info: { containerId } } = workflow;
    
    // Area the user can see, in workflow coordinates
    const isAreaVisible = (area) => areaCoverage(area, visibleFrame) < visibilityThreshold;

    /* The paste position depends on the
     * - origin of copied content
     * - visible area of the workflow,
     * - visibility of the copied objects
     * - visibility of the same objects pasted the last time
    */

    /* Workflow is empty */
    if (isWorkflowEmpty) {
        consola.info('workflow is empty: paste to center');
        return {
            position: centerStrategy({ visibleFrame, nodes, clipboardContent }),
            doAfterPaste: () => dispatch('canvas/fillScreen', null, { root: true })
        };
    }

    /* Content has been pasted before */
    if (copyPaste?.lastPasteBounds && isAreaVisible(copyPaste.lastPasteBounds)) {
        consola.info('paste again, last paste not visible anymore: paste to center');
        return {
            position: centerStrategy({ visibleFrame, nodes, clipboardContent })
        };
    } else if (copyPaste?.lastPasteBounds) {
        consola.info('paste again, last paste visible: paste shifted');
        return {
            position: originStrategy({ visibleFrame, nodes, clipboardContent }) ||
                      centerStrategy({ visibleFrame, nodes, clipboardContent })
        };
    }

    /* Content comes from another application or workflow and is pasted for the first time */
    let copiedFromAnotherApp = !copyPaste || copyPaste.payloadIdentifier !== clipboardContent.payloadIdentifier;
    
    let copiedFromAnotherWorkflow = clipboardContent.workflowId !== containerId ||
                                    clipboardContent.projectId !== projectId;

    if (copiedFromAnotherApp || copiedFromAnotherWorkflow) {
        consola.info('content comes from another app or workflow: paste to center');
        return {
            position: centerStrategy({ visibleFrame, nodes, clipboardContent })
        };
    }
    
    /* Content comes from this application and workflow and is pasted for the first time */
    if (isAreaVisible(clipboardContent.objectBounds)) {
        consola.info(`less than ${visibilityThreshold * 100}% of copied content visible: paste to center`);
        return {
            position: centerStrategy({ visibleFrame, nodes, clipboardContent })
        };
    } else {
        consola.info(`${visibilityThreshold * 100}% or more of copied content visible: paste with origin`);
        return {
            position: originStrategy({ visibleFrame, nodes, clipboardContent }) ||
                      centerStrategy({ visibleFrame, nodes, clipboardContent })
        };
    }
};
