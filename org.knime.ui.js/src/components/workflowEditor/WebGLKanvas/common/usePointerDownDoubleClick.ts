type PreventableDoubleClickOptions = {
  handler?: (event: PointerEvent) => void;
  checkForPreventDefault?: boolean;
};

const TIME_BETWEEN_CLICKS_MS = 200;

/**
 * Implements Double click based on pointerdown event that is preventable.
 * This is required to have double clicks on the blank canvas.
 * @param options
 */
export const usePointerDownDoubleClick = (
  options: PreventableDoubleClickOptions = {
    checkForPreventDefault: false,
  },
) => {
  // keep track of the time when the last click happened
  const lastClick = {
    time: 0,
    clientX: 0,
    clientY: 0,
  };
  /**
   * The event handler for the pointerdown event
   * @returns true if it was double click otherwise false
   */
  const pointerDownDoubleClick = (pointerDownEvent: PointerEvent) => {
    // only left clicks
    if (pointerDownEvent.button !== 0) {
      return false;
    }

    // do nothing on default prevent this way we can communicate from the pixi events that they has handled
    // and should now be ignored. Outer listeners (to the <canvas>/<div> wrapper elements) are interpreted as the
    // "default" action.
    if (options.checkForPreventDefault && pointerDownEvent.defaultPrevented) {
      return false;
    }

    // detect two clicks that need to happen in the time frame of TIME_BETWEEN_CLICKS_MS
    if (performance.now() - lastClick.time > TIME_BETWEEN_CLICKS_MS) {
      lastClick.time = performance.now();
      lastClick.clientX = pointerDownEvent.clientX;
      lastClick.clientY = pointerDownEvent.clientY;
      return false;
    }

    // check if the use has moved
    if (
      Math.abs(lastClick.clientX - pointerDownEvent.clientX) > 0 &&
      Math.abs(lastClick.clientY - pointerDownEvent.clientY) > 0
    ) {
      return false;
    }

    options.handler?.(pointerDownEvent);
    return true;
  };

  return { pointerDownDoubleClick };
};
