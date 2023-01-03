/**
 * @typedef SelectionRange
 * @property {Number} from
 * @property {Number} to
 */

/**
 * @typedef MultiSelectionState
 * @property {Array<Number>} anchorHistory
 * @property {Array<Number>} anchorExceptions
 * @property {Array<SelectionRange>} selectionRanges
 */
  
/**
 * Initalize the state of the multi selection service
 * @returns {MultiSelectionState}
 */
export const getInitialState = () => ({
    anchorHistory: [],
    anchorExceptions: [],
    selectionRanges: []
});
  
/**
 * Merges a an initial state and a partial state together
 * @param {MultiSelectionState} initialState
 * @param {Partial<MultiSelectionState>} newState
 * @returns {MultiSelectionState}
 */
const mergeStates = (initialState, newState) => ({ ...initialState, ...newState });
  
/**
 * Determines whether there is any active selection in the provided state
 * @param {MultiSelectionState} state
 * @param {Number} initialElement
 * @returns {Boolean}
 */
export const isMultipleSelectionActive = (state, initialElement) => {
    const { selectionRanges } = state;
  
    if (selectionRanges.length === 1) {
        const [firstRange] = selectionRanges;
        const { from, to } = firstRange;
  
        // The selection is not active if it only has 1 range with a single element
        // and that element is the initial one
        if (from === to && from === initialElement) {
            return false;
        }
    }
  
    return selectionRanges.length !== 0;
};

/**
 * Determines whether the provided item is selected considering the given selection state
 * by trying to find it inside the selection ranges, bounded by the from and to properties
 *
 * @param {MultiSelectionState} state
 * @param {Number} item
 * @returns {Boolean}
 */
export const isItemSelected = (state, item) => {
    const { selectionRanges, anchorExceptions } = state;
    const isInRange = selectionRanges.find(
        range => range.from <= item && range.to >= item
    );

    return isInRange && !anchorExceptions.includes(item);
};
  
/**
 * Executes the Ctrl+Click logic. Will set (or unset) the clicked item into the selection state
 * updating it accordingly.
 *
 * e.g: New items will be added, existing items will be removed
 *
 * @param {MultiSelectionState} state
 * @param {Number} clickedItem
 * @returns {MultiSelectionState}
 */
export const ctrlClick = (state, clickedItem) => {
    const { anchorHistory, selectionRanges, anchorExceptions } = state;

    // Update the anchor history whenever ctrl + click is used
    // and take this history as reference for future shift + clicks
    const withUpdatedAnchorHistory = mergeStates(state, {
        anchorHistory: [...anchorHistory, clickedItem]
    });
  
    const isSelected = isItemSelected(state, clickedItem);
  
    // If element was not previously selected
    if (!isSelected) {
        // create a new range of a single item for that element,
        // so that it gets highlighted
        const newRange = {
            from: clickedItem,
            to: clickedItem
        };
  
        const alreadyInRange = selectionRanges.find(
            ({ from, to }) => from <= newRange.from && newRange.to <= to
        );
  
        // We also have to make sure not to add the anchor if it would already be included
        // in an existing range.
        // (e.g: (1) Range is created (via Shift+click), (2) item is removed (with Ctrl+click), and now
        // it's being added again
        const newSelectionRanges = alreadyInRange ? selectionRanges : [...selectionRanges, newRange];
  
        // update the selection state with the new range
        return mergeStates(withUpdatedAnchorHistory, {
            selectionRanges: newSelectionRanges,
  
            // make sure to remove the element from the anchor exceptions in case it
            // was already in there
            anchorExceptions: anchorExceptions.filter((ex) => ex !== clickedItem)
        });
    }
  
    // If the item was selected
    if (isSelected) {
        // then we need to add it to the anchor exceptions to make sure
        // it's not higlighted
        return mergeStates(withUpdatedAnchorHistory, {
            anchorExceptions: [...anchorExceptions, clickedItem]
        });
    }

    // fallback to same state
    return state;
};
  
/**
 * Executes the Shift+Click logic. Will set (or unset) the clicked item into the selection state
 * updating it accordingly and also updating any possible selection ranges.
 *
 * @param {MultiSelectionState} state
 * @param {Number} clickedItem
 * @returns {MultiSelectionState}
 */
export const shiftClick = (state, clickedItem) => {
    const { anchorHistory, selectionRanges, anchorExceptions } = state;

    if (selectionRanges.length === 0) {
        const newRange = {
            from: clickedItem,
            to: clickedItem
        };

        // update selection state and create new range and anchor from clicked item for future selections
        return mergeStates(state, {
            selectionRanges: [...selectionRanges, newRange],
            anchorHistory: [...anchorHistory, clickedItem]
        });
    }
  
    // grab the last anchor in the history and use that one for reference
    const [lastAnchor] = anchorHistory.slice(-1);
  
    // When shift + clicking we have to query the exceptions and make sure
    // to remove any that were considered as "excluded" before, but that now
    // should are "included" in the range that is being selected.
    // For this we just need to find an exception that falls
    // in range between the selected item (with shift + click) and the last anchor
    const updatedExceptions = anchorExceptions.filter((exception) => {
        const lowerBound = Math.min(lastAnchor, clickedItem);
        const upperBound = Math.max(lastAnchor, clickedItem);
  
        return !(lowerBound <= exception && exception <= upperBound);
    });
  
    const withUpdatedExceptions = mergeStates(state, {
        anchorExceptions: updatedExceptions
    });
  
    // Try to find an existing selection range that includes this lastAnchor
    // in either the "from" or the "to" property
    const isRangeFound = selectionRanges.find(
        ({ from, to }) => from === lastAnchor || to === lastAnchor
    );
  
    // If such a range exists, then we need to update it, to either
    // expand the range (more elems selected) or contract it (less elems selected)
    if (isRangeFound) {
        // replace the range that includes the lastAnchor
        const newSelectionRanges = selectionRanges.map(({ from, to }) => {
            const sameFrom = from === lastAnchor;
            const sameTo = to === lastAnchor;
  
            // update the range that contains the same anchor that was last used
            return sameFrom || sameTo
                // make sure the "from" is always the smallest number
                ? {
                    from: Math.min(lastAnchor, clickedItem),
                    to: Math.max(lastAnchor, clickedItem)
                }
                // otherwise, if it's not the range we're looking for, keep it as is
                : { from, to };
        });
  
        // update the selection range, now with the proper range replaced
        return mergeStates(withUpdatedExceptions, {
            selectionRanges: newSelectionRanges
        });
    } else {
        // if there's no range that includes the lastAnchor that means this is a new range
        // so we must create it
        const newRange = {
            // again, make sure the smallest number is the "from" property
            from: Math.min(lastAnchor, clickedItem),
            to: Math.max(lastAnchor, clickedItem)
        };
  
        return mergeStates(withUpdatedExceptions, {
            selectionRanges: [...selectionRanges, newRange]
        });
    }
};
  
/**
 * Executes the "Click" logic. Will reset any selection state, since click alone would unselect
 *
 * @param {Number} clickedItem
 * @returns {MultiSelectionState}
 */
export const click = (clickedItem) => {
    // regular clicks reset the multiselection state
    // and sets the anchor to be the clicked item
    const state = {
        anchorExceptions: [],
        anchorHistory: [clickedItem],
        selectionRanges: [{ from: clickedItem, to: clickedItem }]
    };
  
    return mergeStates(getInitialState(), state);
};
  
/**
 * Given a multiselection state, output a flat collection of selection ranges that is
 * sliced taking into account the anchorExceptions provided in the state. This means
 * that the output selection ranges will be normalized to not include the anchor exceptions
 *
 * e.g: Given a state with ranges: [(1-5), (7-10)], and anchorExceptions: [2, 8]
 *     The output for this example should be these ranges: [(1-1), (3-5), (7-7), (9-10)]. Since these ranges do not
 *     include items 2 and 8
 *
 * @param {MultiSelectionState} state
 * @returns {Array<SelectionRange>}
 */
const sliceOnExceptions = (state) => {
    const { anchorExceptions, selectionRanges } = state;
  
    const rawOutput = anchorExceptions.reduce((ranges, exception) => {
        const rangeContainingException = ranges.find(
            ({ from, to }) => from <= exception && exception <= to
        );
  
        // everytime a range is found that includes an exception,
        // we have to slice that range to exclude said exception
        if (rangeContainingException) {
            const { from, to } = rangeContainingException;
  
            const newRanges = ranges.reduce((acc, range) => {
                const isRangeWithException = range.from === from && range.to === to;
                if (isRangeWithException) {
                    const isExceptionFrom = exception === from;
                    const isExceptionTo = exception === to;
  
                    // if the exception is at the beginning of the range
                    // then we have to adjust the "from" and "to" values
                    // to be that of the exception. This will create a range of a single item,
                    // which will be the exception itself.
                    // Otherwise, if it's not at the beginning of the range, take the values
                    // from the start of the range until 1 unit before the exception
                    const headRangeSlice = {
                        from: isExceptionFrom ? exception : from,
                        to: isExceptionFrom ? exception : exception - 1
                    };
  
                    // if the exception is at the end of the range
                    // then we have to adjust the "from" and "to" values
                    // to be that of the exception. This will create a range of a single item,
                    // which will be the exception itself
                    // Otherwise, if it's not at the end of the range, take the values
                    // from 1 unit after the exception until the end of the range
                    const tailRangeSlice = {
                        from: isExceptionTo ? exception : exception + 1,
                        to: isExceptionTo ? exception : to
                    };
  
                    return acc.concat(headRangeSlice, tailRangeSlice);
                }
  
                return acc.concat(range);
            }, []);
  
            return newRanges;
        }
  
        return ranges;
    }, selectionRanges);
  
    // Filter out any ranges whose "from" and "to" values are exactly that of any existing exceptions
    return rawOutput.filter(
        (range) => !anchorExceptions.includes(range.from) && !anchorExceptions.includes(range.to)
    );
};
  
/**
 * Removes any ranges that could be included inside any other (bigger) existing range
 * inside the input.
 *
 * e.g: Given two ranges: (1-6) and (2-4), the latter would be "included" in the first one
 *
 * @param {Array<SelectionRange>} ranges
 * @returns {Array<SelectionRange>}
 */
const removeSubRanges = (ranges) => ranges.reduce((acc, range, _, arr) => {
    const isIncluded = arr.find((subRange) => {
        const isContained = subRange.from < range.from && range.to < subRange.to;
        const hasSameStart = subRange.from <= range.from && range.to < subRange.to;
        const hasSameEnd = subRange.from < range.from && range.to <= subRange.to;

        return isContained || hasSameStart || hasSameEnd;
    });
  
    return isIncluded ? acc : acc.concat(range);
}, []);

/**
 * Removes any ranges that could be overlapping inside the input joining them as required.
 *
 * e.g - 1: Given two ranges: (4-7) and (1-6), the latter would be "overlapping" (the left side) of the first one
 *      The correct output range for this example should be: (1-7)
 *
 * e.g - 2: Given two ranges: (1-5) and (4-9), the latter would be "overlapping" (the right side) of the first one
 *      The correct output range for this example should be: (1-9)
 *
 * @param {Array<SelectionRange>} ranges
 * @returns {Array<SelectionRange>} contiguous ranges without overlap
 */
const removeOverlappingRanges = (ranges) => {
    const overlappingRangeIndexes = [];
    const updatedRanges = [];
    for (let currIndex = 0; currIndex < ranges.length; currIndex++) {
        const currentRange = ranges[currIndex];

        const overlappedLeftIndex = ranges.findIndex((_range, _index) => {
            const isOverlappedLeft =
                // _range starts earlier
                _range.from <= currentRange.from &&
                // _range ends in-between `currentRange`
                (_range.to >= currentRange.from && _range.to <= currentRange.to);

            const isSameItem = _index === currIndex;

            return isOverlappedLeft && !isSameItem;
        });
        
        const overlappedRightIndex = ranges.findIndex((_range, _index) => {
            const isOverlappedRight =
                // _range starts after
                _range.from >= currentRange.from &&
                // `currentRange` ends in-between _range
                (currentRange.from >= _range.from && currentRange.to <= _range.to);
            const isSameItem = _index === currIndex;

            return isOverlappedRight && !isSameItem;
        });

        if (overlappedLeftIndex !== -1) {
            overlappingRangeIndexes.push(overlappedLeftIndex);

            updatedRanges.push({
                from: ranges[overlappedLeftIndex].from,
                to: currentRange.to
            });
            continue;
        }
        
        if (overlappedRightIndex !== -1) {
            overlappingRangeIndexes.push(overlappedRightIndex);

            updatedRanges.push({
                from: currentRange.from,
                to: ranges[overlappedRightIndex].to
            });
            continue;
        }

        if (!overlappingRangeIndexes.includes(currIndex)) {
            updatedRanges.push(currentRange);
            continue;
        }
    }

    return updatedRanges;
};
  
/**
 *
 * @param {MultiSelectionState} state
 * @returns {Array<SelectionRange>}
 */
export const normalizeRanges = (state) => {
    const slicedByExceptions = sliceOnExceptions(state);
    const withoutSubRanges = removeSubRanges(slicedByExceptions);
    const withoutOverlap = removeOverlappingRanges(withoutSubRanges);
    return withoutOverlap;
};

/**
 * Returns the selection size for the given state
 * @param {MultiSelectionState} state
 * @returns {Number}
 */
export const selectionSize = (state) => {
    const normalized = normalizeRanges(state);

    const selectionSize = normalized.reduce((total, range) => {
        const { from, to } = range;
        const size = (to + 1) - from;
        return total + size;
    }, 0);

    return selectionSize;
};

/**
 * Returns an array of all the indexes that are selected in the given state
 * @param {MultiSelectionState} state
 * @returns {Array<Number>} selected indexes
 */
export const getSelectedIndexes = (state) => {
    const selectionRanges = normalizeRanges(state);

    return selectionRanges.reduce((acc, range) => {
        const { to, from } = range;
        const rangeSize = to - from;
        
        // given a size N (e.g: 4) and a starting value X (e.g: 3)
        // create an array of length N, whose elements are [X, X + 1, X + 2, ... X + N]
        const indexesInRange = new Array(rangeSize)
            .fill(0)
            .reduce((acc, i) => {
                const [previous] = acc.slice(-1);
                return acc.concat(previous + 1);
            }, [from]);

        return acc.concat(indexesInRange);
    }, []);
};
