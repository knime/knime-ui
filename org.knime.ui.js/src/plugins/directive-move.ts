/**
 * Drag & Drop Vue directive.
 *
 * @example:
 * <el v-move="{ onMove, onMoveStart, onMoveEnd }" />
 *
 * @param {Function=} onMoveStart Optional handler for the `movestart` event
 * @param {Function=} onMove Optional handler for the `moving` event
 * @param {Function=} onMoveEnd Optional handler for the `moveend` event
 * @param {boolean=} isProtected Only applies the directive if is false
 *
 * The movestart, moving, and moveend events have a `detail` property which holds the attributes
 * `startX`, `startY`, `deltaX`, `deltaY`, `totalDeltaX`, `totalDeltaY`, `endX`, `endY` and `e`
 * respectively, depending on the event type.
 */

import type { XY } from "@/api/gateway-api/generated-api";
import type { Directive } from "vue";

type MoveStartEventDetail = {
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  event: PointerEvent;
};

type MoveEventDetail = {
  deltaX: number;
  deltaY: number;
  clientX: number;
  clientY: number;
  altKey: boolean;
  event: PointerEvent;
};

type MoveEndEventDetail = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  event: PointerEvent;
};

type DirectiveBinding = {
  isProtected: boolean;
  onMoveStart?: (event: CustomEvent<MoveStartEventDetail>) => any;
  onMove?: (event: CustomEvent<MoveEventDetail>) => any;
  onMoveEnd?: (event: CustomEvent<MoveEndEventDetail>) => any;
};

interface MoveState {
  /**
   * Determines whether move can happen or not
   */
  isProtected: boolean;
  /**
   * Whether the element that this state corresponds to is being dragged
   */
  dragging: boolean;
  /**
   * Callbacks to call when each of the drag lifecycle events happen
   */
  handlers: Pick<DirectiveBinding, "onMoveStart" | "onMove" | "onMoveEnd">;

  /**
   * Stored reference of the registered pointerdown event handler for the native
   * pointer event
   * @param event native event
   */
  pointerdownHandler: (event: PointerEvent) => void;
  /**
   * Stored reference of the registered pointermove event handler for the native
   * pointer event
   * @param event native event
   */
  pointermoveHandler: (event: PointerEvent) => void;
  /**
   * Stored reference of the registered pointerup event handler for the native
   * pointer event
   * @param event native event
   */
  pointerupHandler: (event: PointerEvent) => void;

  /** Pointer ID that has the pointercapture */
  pointerId?: number;
  /** Position where the drag started */
  startPosition?: XY;
  /** Store the position of the previous move (if any) */
  previousPosition?: XY;
}

const stateMap: WeakMap<HTMLElement, MoveState> = new WeakMap();

const createPointerdownHandler =
  (srcElement: HTMLElement) => (event: PointerEvent) => {
    const state = stateMap.get(srcElement);
    if (state.isProtected) {
      return;
    }

    // only left mouse button can move
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const { pointerId } = event;
    state.pointerId = pointerId;

    srcElement.addEventListener("pointermove", state.pointermoveHandler);

    const { clientX, clientY } = event;
    delete state.previousPosition;
    state.startPosition = { x: clientX, y: clientY };
  };

const createPointermoveHandler =
  (srcElement: HTMLElement) => (event: PointerEvent) => {
    const state = stateMap.get(srcElement);

    if (!state.startPosition) {
      return;
    }

    const { x: startX, y: startY } = state.startPosition;
    const { clientX, clientY } = event;
    const [moveX, moveY] = [clientX - startX, clientY - startY];

    if (!srcElement.hasPointerCapture(state.pointerId)) {
      srcElement.setPointerCapture(state.pointerId);
    }

    event.stopPropagation();
    event.preventDefault();

    // dispatch `movestart` event for the first move
    if (!state.dragging && state.handlers.onMoveStart) {
      const moveStartEvent = new CustomEvent<MoveStartEventDetail>(
        "movestart",
        {
          detail: {
            startX,
            startY,
            event,
            clientX: event.clientX,
            clientY: event.clientY,
          },
        },
      );
      state.handlers.onMoveStart(moveStartEvent);
    }

    state.dragging = true;

    const deltaX = state.previousPosition
      ? moveX - state.previousPosition.x
      : moveX;
    const deltaY = state.previousPosition
      ? moveY - state.previousPosition.y
      : moveY;

    state.previousPosition = { x: moveX, y: moveY };

    if (state.handlers.onMove) {
      const moveEvent = new CustomEvent<MoveEventDetail>("moving", {
        detail: {
          deltaX,
          deltaY,
          event,
          altKey: event.altKey,
          clientX: event.clientX,
          clientY: event.clientY,
        },
      });

      state.handlers.onMove(moveEvent);
    }
  };

const createPointerupHandler =
  (srcElement: HTMLElement) => (event: PointerEvent) => {
    const state = stateMap.get(srcElement);

    srcElement.releasePointerCapture(event.pointerId);
    srcElement.removeEventListener("pointermove", state.pointermoveHandler);
    delete state.pointerId;

    if (state.dragging && state.handlers.onMoveEnd) {
      const { clientX, clientY } = event;
      const { x: startX, y: startY } = state.startPosition;
      const moveEndEvent = new CustomEvent<MoveEndEventDetail>("moveend", {
        detail: {
          startX,
          startY,
          endX: clientX,
          endY: clientY,
          event,
        },
      });

      state.handlers.onMoveEnd(moveEndEvent);
    }

    delete state.startPosition;
    delete state.dragging;
  };

const initializeState = (el: HTMLElement, value: DirectiveBinding) => {
  if (stateMap.get(el)) {
    return;
  }

  const state: MoveState = {
    isProtected: value.isProtected,
    handlers: value,
    dragging: false,
    pointerdownHandler: createPointerdownHandler(el),
    pointermoveHandler: createPointermoveHandler(el),
    pointerupHandler: createPointerupHandler(el),
  };

  el.addEventListener("pointerdown", state.pointerdownHandler);
  el.addEventListener("pointerup", state.pointerupHandler);
  el.addEventListener("lostpointercapture", state.pointerupHandler);

  stateMap.set(el, state);
};

const options: Directive<HTMLElement, DirectiveBinding> = {
  mounted: (el, { value }) => {
    // Only insert when the object is writable
    if (value.isProtected) {
      return;
    }

    initializeState(el, value);
  },

  unmounted: (el, { value }) => {
    // Only insert when the object is writable
    if (value.isProtected) {
      return;
    }
    const state = stateMap.get(el);

    el.removeEventListener("pointerdown", state.pointerdownHandler);
    el.removeEventListener("pointermove", state.pointermoveHandler);
    el.removeEventListener("pointerup", state.pointerupHandler);
    el.removeEventListener("lostpointercapture", state.pointerupHandler);

    stateMap.delete(el);
  },

  // reapply the pointer capture when the component changes
  // this is necessary, as otherwise the capture is lost on rerender of the view
  updated: (el, { value }) => {
    // Only insert when the object is writable
    if (!stateMap.get(el)) {
      initializeState(el, value);
    }

    const state = stateMap.get(el);
    state.isProtected = value.isProtected;

    if (value.isProtected) {
      return;
    }

    if (
      Reflect.has(state, "pointerId") &&
      !el.hasPointerCapture(state.pointerId)
    ) {
      el.setPointerCapture(state.pointerId);
    }
  },
};

export const directiveMove = {
  name: "move",
  options,
};
