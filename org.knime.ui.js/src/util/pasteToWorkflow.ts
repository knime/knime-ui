import { areaCoverage } from '@/util/geometry';
import { findFreeSpaceAroundCenterWithFallback,
    visibilityThreshold } from '@/util/findFreeSpaceOnCanvas';
import { nodeSize } from '@/style/shapes.mjs';


/**
 * Tries to fit clipboard objects beginning at the screen's center
 * If no free space is found within the canvas's border, it will be pasted directly at center
 * @returns { Object } x and y position
 */
export const centerStrategy = ({ visibleFrame, clipboardContent, nodes }) => {
    const { objectBounds } = clipboardContent;
    return findFreeSpaceAroundCenterWithFallback({ visibleFrame, nodes, objectBounds });
};

// eslint-disable-next-line no-magic-numbers
const getRandomNoise = () => (Math.random() * 2 - 1) * 10;

/**
 * Tries to fit clipboard objects beginning at a fixed positive offset with random noise from the original position
 * If the offsetted position is not visible within the canvas' borders, it returns null
 * @returns { Object | null } x and y position
 */
export const offsetStrategy = ({ clipboardContent, visibleFrame }) => {
    const { objectBounds } = clipboardContent;
    const meanOffset = 120;

    const offsetPosition: { left: number, top: number } = {
        left: objectBounds.left + meanOffset + getRandomNoise(),
        top: objectBounds.top + meanOffset + getRandomNoise()
    };

    const visibility = areaCoverage({
        ...offsetPosition, width: objectBounds.width, height: objectBounds.height
    }, visibleFrame);

    if (visibility >= visibilityThreshold) {
        return { x: offsetPosition.left, y: offsetPosition.top };
    }
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
            position: offsetStrategy({ visibleFrame, clipboardContent }) ||
                centerStrategy({ visibleFrame, nodes, clipboardContent })
        };
    }

    /* Content comes from another application or workflow and is pasted for the first time */
    const copiedFromAnotherApp = !copyPaste || copyPaste.payloadIdentifier !== clipboardContent.payloadIdentifier;

    const copiedFromAnotherWorkflow = clipboardContent.workflowId !== containerId ||
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
            position: offsetStrategy({ visibleFrame, clipboardContent }) ||
                centerStrategy({ visibleFrame, nodes, clipboardContent })
        };
    }
};


export const pasteURI = (string, activeWorkflow, position, visibleFrame) => {
    if (window.importURIAtWorkflowCanvas) {
        const { nodes, projectId, info: { containerId } } = activeWorkflow;
        let x, y;
        if (position) {
            x = position.x - nodeSize / 2;
            y = position.y - nodeSize / 2;
        } else {
            const center = centerStrategy({
                visibleFrame,
                nodes,
                clipboardContent: { objectBounds: { width: nodeSize, height: nodeSize } }
            });
            x = center.x;
            y = center.y;
        }
        return window.importURIAtWorkflowCanvas(string, projectId, containerId,
            x, y);
    } else {
        return false;
    }
};

