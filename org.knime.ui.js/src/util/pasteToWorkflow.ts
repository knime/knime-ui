import { nodeSize } from '@/style/shapes.mjs';
import { geometry } from '@/util/geometry';

// eslint-disable-next-line no-magic-numbers
const getRandomNoise = () => (Math.random() * 2 - 1) * 25;

/**
 * Tries to fit clipboard objects beginning at the screen's center
 * If no free space is found within the canvas's border, it will be pasted directly at center
 * @returns { Object } x and y position
 */
export const centerStrategy = ({ visibleFrame, clipboardContent }) => {
    const { x, y } = geometry.utils.getCenteredPositionInVisibleFrame(visibleFrame, clipboardContent.objectBounds);
   
    const centerPosition = {
        x: x + getRandomNoise(),
        y: y + getRandomNoise()
    };

    return centerPosition;
};

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

    const visibility = geometry.utils.areaCoverage({
        ...offsetPosition, width: objectBounds.width, height: objectBounds.height
    }, visibleFrame);

    if (visibility >= geometry.constants.VISIBILITY_THRESHOLD) {
        return { x: offsetPosition.left, y: offsetPosition.top };
    }
    return null;
};

/*
 * returns position and what to do after pasting
*/
export const pastePartsAt = ({ visibleFrame, clipboardContent, isWorkflowEmpty, dispatch }) => {
    /* Workflow is empty */
    if (isWorkflowEmpty) {
        consola.info('workflow is empty: paste to center');
        return {
            position: centerStrategy({ visibleFrame, clipboardContent }),
            doAfterPaste: () => dispatch('canvas/fillScreen', null, { root: true })
        };
    }

    return {
        position: offsetStrategy({ visibleFrame, clipboardContent }) ||
            centerStrategy({ visibleFrame, clipboardContent })
    };
};


export const pasteURI = (string, activeWorkflow, position, visibleFrame) => {
    if (window.importURIAtWorkflowCanvas) {
        const { projectId, info: { containerId } } = activeWorkflow;
        let x, y;
        if (position) {
            x = position.x - nodeSize / 2;
            y = position.y - nodeSize / 2;
        } else {
            const center = centerStrategy({
                visibleFrame,
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

