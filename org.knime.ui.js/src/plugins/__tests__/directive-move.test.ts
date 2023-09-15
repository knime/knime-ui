import { expect, describe, beforeAll, it, vi, afterEach } from "vitest";
import * as Vue from "vue";
import { mount, config, VueWrapper } from "@vue/test-utils";

import { directiveMove } from "../directive-move";
import { mockBoundingRect } from "@/test/utils";

describe("directive-move", () => {
  beforeAll(() => {
    config.global.directives = {
      [directiveMove.name]: directiveMove.options,
    };

    HTMLElement.prototype.hasPointerCapture = vi.fn();
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({
    onMove = vi.fn(),
    onMoveStart = vi.fn(),
    onMoveEnd = vi.fn(),
    isProtected = false,
    dragReferenceElementSelector = null,
  } = {}) => {
    const template = `
    <div v-move="{
      onMove,
      onMoveStart,
      onMoveEnd,
      isProtected,
      dragReferenceElementSelector,
    }"><div class="inner-reference"></div></div>
    `;

    const wrapper = mount({
      methods: { onMove, onMoveStart, onMoveEnd },
      template,
      data: () => ({ isProtected, dragReferenceElementSelector }),
    });

    const hasPointerCapture = vi.fn();
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    wrapper.element.hasPointerCapture = hasPointerCapture;
    wrapper.element.setPointerCapture = setPointerCapture;
    wrapper.element.releasePointerCapture = releasePointerCapture;

    return {
      wrapper,
      onMove,
      onMoveStart,
      onMoveEnd,
      hasPointerCapture,
      setPointerCapture,
      releasePointerCapture,
    };
  };

  const dispatchPointerEvent = (
    wrapper: VueWrapper<any>,
    eventType:
      | "pointerdown"
      | "pointermove"
      | "pointerup"
      | "lostpointercapture",
    { clientX = 0, clientY = 0, button = 0 },
  ) => {
    const pointerEvent = new Event(eventType);

    // @ts-ignore
    pointerEvent.clientX = clientX;
    // @ts-ignore
    pointerEvent.clientY = clientY;
    // @ts-ignore
    pointerEvent.button = button;
    pointerEvent.stopPropagation = vi.fn();
    pointerEvent.preventDefault = vi.fn();

    wrapper.element.dispatchEvent(pointerEvent);

    return pointerEvent;
  };

  it("should not try to move without first clicking", async () => {
    const { wrapper, onMove } = doMount();

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    await Vue.nextTick();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("should handle moving elements", () => {
    const { wrapper, setPointerCapture, onMoveStart, onMove } = doMount();

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 50,
      clientY: 50,
    });

    // we ignore on purpose the first on move event after pointerDown
    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 0,
      clientY: 0,
    });

    const moveEvent = dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    expect(onMoveStart).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          startX: 50,
          startY: 50,
          // move start gets passed the move event, not the start event. This is by design
          event: moveEvent,
        }),
      }),
    );

    expect(setPointerCapture).toHaveBeenCalled();

    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          deltaX: 50,
          deltaY: 50,
          event: moveEvent,
          clientX: 100,
          clientY: 100,
        }),
      }),
    );

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 150,
      clientY: 150,
    });

    expect(onMove).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          deltaX: 50,
          deltaY: 50,
          clientX: 150,
          clientY: 150,
        }),
      }),
    );
  });

  it("should use drag reference selector for moving", () => {
    mockBoundingRect({ top: 10, left: 10, right: 30, bottom: 40 });
    const { wrapper, onMoveStart } = doMount({
      dragReferenceElementSelector: ".inner-reference",
    });

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 50,
      clientY: 50,
    });

    // we ignore on purpose the first on move event after pointerDown
    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 0,
      clientY: 0,
    });

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    // move does not get called because it's not inside the reference's rect
    expect(onMoveStart).not.toHaveBeenCalled();

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 17,
      clientY: 28,
    });

    // we ignore on purpose the first on move event after pointerDown
    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 0,
      clientY: 0,
    });

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    expect(onMoveStart).toHaveBeenCalled();
  });

  it("should only work with the left button", () => {
    const { wrapper, onMoveStart } = doMount();

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 50,
      clientY: 50,
      button: 1,
    });

    expect(onMoveStart).not.toHaveBeenCalled();
  });

  it("shoud handle move end", () => {
    const { wrapper, onMoveEnd, releasePointerCapture } = doMount();

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 50,
      clientY: 50,
    });

    // we ignore on purpose the first on move event after pointerDown
    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 0,
      clientY: 0,
    });

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    dispatchPointerEvent(wrapper, "pointerup", {
      clientX: 100,
      clientY: 100,
    });

    expect(onMoveEnd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          startX: 50,
          startY: 50,
          endX: 100,
          endY: 100,
        }),
      }),
    );

    expect(releasePointerCapture).toHaveBeenCalled();
  });

  it("removes the listener", () => {
    const { wrapper, onMoveStart, onMove, onMoveEnd } = doMount();
    wrapper.unmount();

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 50,
      clientY: 50,
    });

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    dispatchPointerEvent(wrapper, "pointerup", {
      clientX: 100,
      clientY: 100,
    });

    expect(onMoveStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onMoveEnd).not.toHaveBeenCalled();
  });

  it("does not update if isProtected is true and updates if isProtected is false", async () => {
    const { wrapper, onMoveStart, onMove, onMoveEnd } = doMount({
      isProtected: true,
    });

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 50,
      clientY: 50,
    });

    // we ignore on purpose the first on move event after pointerDown
    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 0,
      clientY: 0,
    });

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    dispatchPointerEvent(wrapper, "pointerup", {
      clientX: 100,
      clientY: 100,
    });

    expect(onMoveStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onMoveEnd).not.toHaveBeenCalled();

    await wrapper.setData({ isProtected: false });

    dispatchPointerEvent(wrapper, "pointerdown", {
      clientX: 50,
      clientY: 50,
    });

    // we ignore on purpose the first on move event after pointerDown
    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 0,
      clientY: 0,
    });

    dispatchPointerEvent(wrapper, "pointermove", {
      clientX: 100,
      clientY: 100,
    });

    dispatchPointerEvent(wrapper, "pointerup", {
      clientX: 100,
      clientY: 100,
    });

    expect(onMoveStart).toHaveBeenCalled();
    expect(onMove).toHaveBeenCalled();
    expect(onMoveEnd).toHaveBeenCalled();
  });
});
