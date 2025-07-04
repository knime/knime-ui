import type { FederatedPointerEvent } from "pixi.js";

export type CustomPointerEventDataset = {
  initiator: string;
  skipGlobalSelection?: boolean;
};

/**
 * Marks a WebGL (Pixi) canvas event or DOM pointer event as "handled". This essentially
 * means that an object already started an interaction on this event phase,
 * and this is useful to know as the event bubbles up to the native `<canvas>`
 * element where other events could potentially be listening for interactions
 * on the "empty" parts of the canvas (e.g rectangle selection, quick action menu)
 */
export const markEventAsHandled = (
  event: FederatedPointerEvent | PointerEvent,
  dataset: CustomPointerEventDataset,
) => {
  const nativeEvent = event instanceof PointerEvent ? event : event.nativeEvent;

  if (nativeEvent.dataset) {
    consola.warn(
      `Tried to mark event as handled for "${dataset.initiator}" but was already marked by "${nativeEvent.dataset.initiator}"`,
    );
  }

  const { initiator, skipGlobalSelection = true } = dataset;
  nativeEvent.dataset = {
    initiator,
    skipGlobalSelection,
  };
};
