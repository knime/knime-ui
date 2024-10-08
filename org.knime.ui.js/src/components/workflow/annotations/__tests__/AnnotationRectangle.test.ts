import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

import { $bus } from "@/plugins/event-bus";
import * as $colors from "@/style/colors";

import AnnotationRectangle from "../AnnotationRectangle.vue";

const $shortcuts = {
  findByHotkey: vi.fn(),
  isEnabled: vi.fn(),
  preventDefault: vi.fn(),
  dispatch: vi.fn(),
};

vi.mock("@/plugins/shortcuts", () => ({
  useShortcuts: () => $shortcuts,
}));

describe("AnnotationRectangle", () => {
  const doMount = ({ pointerId = 1 } = {}) => {
    const props = {};
    const switchCanvasModeMock = vi.fn();

    const storeConfig = {
      canvas: {
        getters: {
          screenToCanvasCoordinates: () =>
            vi.fn().mockImplementation(([x, y]) => [x, y]),
        },
      },
      application: {
        actions: {
          switchCanvasMode: switchCanvasModeMock,
        },
      },
    };

    const $store = mockVuexStore(storeConfig);
    const wrapper = mount(AnnotationRectangle, {
      props,
      global: {
        plugins: [$store],
        mocks: {
          $colors,
          $bus,
        },
      },
      attachTo: document.body,
    });

    const pointerDown = ({ clientX, clientY, shiftKey = false }) => {
      $bus.emit("selection-pointerdown", {
        pointerId,
        clientX,
        clientY,
        shiftKey: shiftKey || false,
        currentTarget: {
          // @ts-expect-error
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
        target: {
          // @ts-expect-error
          setPointerCapture: () => null,
        },
      });
    };

    const pointerMove = ({ clientX, clientY }) => {
      $bus.emit("selection-pointermove", {
        pointerId,
        clientX,
        clientY,
        currentTarget: {
          // @ts-expect-error
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
          }),
        },
      });
    };

    const pointerUp = () => {
      vi.useFakeTimers(); // implementation contains setTimout

      // stop also changes global dragging state
      $bus.emit("selection-pointerup", {
        pointerId,
        target: {
          // @ts-expect-error
          releasePointerCapture: vi.fn(),
        },
      });

      vi.runAllTimers();
    };

    return {
      wrapper,
      props,
      $store,
      storeConfig,
      pointerDown,
      pointerUp,
      pointerMove,
      switchCanvasModeMock,
    };
  };

  it("appears on pointerDown, disappears on pointerUp", async () => {
    const { wrapper, pointerDown, pointerUp } = doMount();
    expect(wrapper.isVisible()).toBe(false);

    pointerDown({ clientX: 0, clientY: 0 });
    await nextTick();

    expect(wrapper.isVisible()).toBe(true);

    pointerUp();
    await nextTick();

    expect(wrapper.isVisible()).toBe(false);
  });

  it("toggles annotationMode on pointerUp", async () => {
    const { wrapper, pointerDown, pointerUp, switchCanvasModeMock } = doMount();

    pointerDown({ clientX: 0, clientY: 0 });
    await nextTick();

    expect(wrapper.isVisible()).toBe(true);

    pointerUp();
    await nextTick();

    expect(switchCanvasModeMock).toHaveBeenCalled();
  });

  it("creates correct annotation on pointerUp", async () => {
    const {
      wrapper,
      pointerDown,
      pointerUp,
      switchCanvasModeMock,
      pointerMove,
    } = doMount();

    pointerDown({ clientX: 0, clientY: 0 });
    await nextTick();

    expect(wrapper.isVisible()).toBe(true);
    pointerMove({ clientX: 10, clientY: 13 });

    pointerUp();
    await nextTick();

    expect(switchCanvasModeMock).toHaveBeenCalled();
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
      }),
    );
  });
});
