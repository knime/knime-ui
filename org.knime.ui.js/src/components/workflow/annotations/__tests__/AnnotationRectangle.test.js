import { expect, describe, beforeEach, it, vi } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import { $bus } from "@/plugins/event-bus";
import * as $colors from "@/style/colors.mjs";

import AnnotationRectangle from "../AnnotationRectangle.vue";

describe("AnnotationRectangle", () => {
  let wrapper,
    props,
    doShallowMount,
    $store,
    storeConfig,
    pointerDown,
    pointerUp,
    pointerMove,
    toggleAnnotationModeMock,
    pointerId,
    $shortcuts;

  beforeEach(() => {
    props = {};
    toggleAnnotationModeMock = vi.fn();

    storeConfig = {
      canvas: {
        getters: {
          screenToCanvasCoordinates: () =>
            vi.fn().mockImplementation(([x, y]) => [x, y]),
        },
      },
      application: {
        actions: {
          toggleAnnotationMode: toggleAnnotationModeMock,
        },
      },
    };

    $shortcuts = {
      findByHotkey: vi.fn(),
      isEnabled: vi.fn(),
      preventDefault: vi.fn(),
      dispatch: vi.fn(),
    };

    doShallowMount = () => {
      $store = mockVuexStore(storeConfig);
      wrapper = shallowMount(AnnotationRectangle, {
        props,
        global: {
          plugins: [$store],
          mocks: {
            $colors,
            $bus,
            $shortcuts,
          },
        },
      });
    };

    pointerDown = ({ clientX, clientY, shiftKey }) => {
      $bus.emit("selection-pointerdown", {
        pointerId: pointerId || 1,
        clientX,
        clientY,
        shiftKey: shiftKey || false,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
        target: {
          setPointerCapture: () => null,
        },
      });
    };

    pointerMove = ({ clientX, clientY }) => {
      $bus.emit("selection-pointermove", {
        pointerId: pointerId || 1,
        clientX,
        clientY,
        currentTarget: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
      });
    };

    pointerUp = () => {
      vi.useFakeTimers(); // implementation contains setTimout

      // stop also changes global dragging state
      $bus.emit("selection-pointerup", {
        pointerId: pointerId || 1,
        target: {
          releasePointerCapture: vi.fn(),
        },
      });

      vi.runAllTimers();
    };
  });

  it("appears on pointerDown, disappears on pointerUp", async () => {
    doShallowMount();
    expect(wrapper.isVisible()).toBe(false);

    pointerDown({ clientX: 0, clientY: 0 });
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(true);

    pointerUp();
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(false);
  });

  it("toggles annotationMode on pointerUp", async () => {
    doShallowMount();

    pointerDown({ clientX: 0, clientY: 0 });
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(true);

    pointerUp();
    await Vue.nextTick();

    expect(toggleAnnotationModeMock).toHaveBeenCalled();
  });

  it("creates correct annotation on pointerUp", async () => {
    doShallowMount();

    pointerDown({ clientX: 0, clientY: 0 });
    await Vue.nextTick();

    expect(wrapper.isVisible()).toBe(true);
    pointerMove({ clientX: 10, clientY: 13 });

    pointerUp();
    await Vue.nextTick();

    expect(toggleAnnotationModeMock).toHaveBeenCalled();
    expect($shortcuts.dispatch).toHaveBeenCalledWith(
      "addWorkflowAnnotation",
      expect.objectContaining({
        metadata: {
          position: {
            x: 0,
            y: 0,
          },
          width: 10,
          height: 13,
        },
      })
    );
  });
});
