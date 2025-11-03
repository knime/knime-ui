import type { FederatedPointerEvent } from "pixi.js";

type Initiator =
  | "action-button"
  | "add-port-placeholder"
  | "add-port-placeholder::onEscape"
  | "annotation-transform"
  | "annotation::onContextMenu"
  | "annotation::onLinkClick"
  | "bendpoint::onContextMenu"
  | "component-placeholder::onContextMenu"
  | "connection-select"
  | "connection::onContextMenu"
  | "floating-connector"
  | "floating-connector::onEscape"
  | "minimap-pan"
  | "node::onContextMenu"
  | "node-label-edit"
  | "node-name-edit"
  | "node-port::onEscape"
  | "object-interaction"
  | "object-interaction::onEscape"
  | "text-editing"
  | "node-label-hover";

export type CustomUIEventDataset = {
  initiator: Initiator;
  skipGlobalSelection?: boolean;
  skipDeselectByKeyboard?: boolean;
};

/**
 * Marks a WebGL (Pixi) canvas event or DOM pointer event as "handled". This essentially
 * means that an object already started an interaction on this event phase,
 * and this is useful to know as the event bubbles up to the native `<canvas>`
 * element where other events could potentially be listening for interactions
 * on the "empty" parts of the canvas (e.g rectangle selection, quick action menu)
 */
export const markPointerEventAsHandled = (
  event: FederatedPointerEvent | PointerEvent,
  dataset: CustomUIEventDataset,
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

/**
 * This is used to stop the default escape handler that deselects the nodes from running.
 * This is more verbose then the use of preventDefault.
 */
export const markEscapeAsHandled = (
  event: KeyboardEvent,
  dataset: CustomUIEventDataset,
) => {
  if (event.dataset) {
    consola.warn(
      `Tried to mark event as handled for "${dataset.initiator}" but was already marked by "${event.dataset.initiator}"`,
    );
  }

  const { initiator, skipDeselectByKeyboard = true } = dataset;
  event.dataset = {
    initiator,
    skipDeselectByKeyboard,
  };
};

export const isMarkedEvent = (
  event: FederatedPointerEvent | PointerEvent,
  initiator?: Initiator,
) => {
  const nativeEvent = event instanceof PointerEvent ? event : event.nativeEvent;

  if (!nativeEvent.dataset) {
    return false;
  }

  if (initiator) {
    return nativeEvent.dataset.initiator === initiator;
  }

  return true;
};
