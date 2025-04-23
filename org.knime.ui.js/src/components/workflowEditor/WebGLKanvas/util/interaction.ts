import type { FederatedPointerEvent } from "pixi.js";

export type CustomPointerEventDataset = {
  initiator: string;
  skipGlobalSelection?: boolean;
};

/**
 * Marks a WebGL (Pixi) canvas event as "handled". This essentially
 * means that an object already started an interaction on this event phase,
 * and this is useful to know as the event bubbles up to the native `<canvas>`
 * element where other events could potentially be listening for interactions
 * on the "empty" parts of the canvas (e.g rectangle selection, quick action menu)
 */
export const markEventAsHandled = (
  event: FederatedPointerEvent,
  dataset: CustomPointerEventDataset,
) => {
  if (event.nativeEvent.dataset) {
    consola.warn(
      `Tried to mark event as handled for "${dataset.initiator}" but was already marked by "${event.nativeEvent.dataset.initiator}"`,
    );
  }

  event.nativeEvent.dataset = {
    ...dataset,
    skipGlobalSelection: true,
  };
};
