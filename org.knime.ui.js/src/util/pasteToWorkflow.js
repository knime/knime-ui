import { areaCoverage } from '@/util/geometry';
import { findFreeSpaceFrom,
    findFreeSpaceAroundCenterWithFallback,
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

/**
 * Tries to fit clipboard objects beginning at it's original position
 * If no free space is found within the canvas' borders, it returns null
 * @returns { Object | null } x and y position
 */
const originStrategy = ({ clipboardContent, nodes, visibleFrame }) => {
    const { objectBounds } = clipboardContent;
    let fromOrigin = findFreeSpaceFrom({ objectBounds, nodes, visibleFrame })(clipboardContent.objectBounds);

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


export const pasteURI = (string, activeWorkflow, position, visibleFrame) => {
    if (window.importURIAtWorkflowCanvas) {
        const { nodes, projectId, info: { containerId } } = activeWorkflow;
        let x, y;
        if (position) {
            x = position.x - nodeSize / 2;
            y = position.y - nodeSize / 2;
        } else {
            const center = centerStrategy({ visibleFrame,
                nodes,
                clipboardContent: { objectBounds: { width: nodeSize, height: nodeSize } } });
            x = center.x;
            y = center.y;
        }
        return window.importURIAtWorkflowCanvas(string, projectId, containerId,
            x, y);
    } else {
        return false;
    }
};

