/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, shallowMount } from "@vue/test-utils";

import { navigatorUtils } from "@knime/utils";

import { $bus } from "@/plugins/event-bus";
import {
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
  createWorkflowObject,
} from "@/test/factories";
import { mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { workflowNavigationService } from "@/util/workflowNavigationService";
import Kanvas from "../Kanvas.vue";
import { RESIZE_DEBOUNCE } from "../constants";

vi.mock("@/plugins/event-bus", () => ({
  $bus: {
    emit: vi.fn(),
  },
}));

vi.mock("@/util/workflowNavigationService", () => {
  return {
    workflowNavigationService: {
      nearestObject: vi.fn(),
    },
  };
});

vi.mock("@knime/utils", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    navigatorUtils: {
      isMac: vi.fn(() => false),
      getMetaOrCtrlKey: vi.fn(() => "ctrlKey"),
    },
  };
});

vi.unmock("lodash-es");

describe("Kanvas", () => {
  const doShallowMount = ({
    isWorkflowEmptyMock = false,
    scrollLeft = 0,
    scrollTop = 0,
  } = {}) => {
    const getBoundingClientRectMock = vi.fn();
    getBoundingClientRectMock.mockReturnValue({
      x: 5,
      y: 10,
      width: 15,
      height: 20,
    });
    HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;

    // Mock ResizeObserver Class
    // eslint-disable-next-line func-style
    function ResizeObserverMock(callback) {
      this.callbackRef = callback;
      this.element = null;

      const disconnect = vi.fn();
      ResizeObserverMock.__trigger__ = () => {
        this.callbackRef([{ target: this.element }]);
      };

      ResizeObserverMock.disconnect = disconnect;

      this.observe = function (element) {
        this.element = element;
      };

      this.disconnect = disconnect;
    }

    window.ResizeObserver = ResizeObserverMock;

    const isWorkflowWritableMock = vi.fn(() => true);

    const mockedStores = mockStores();

    // @ts-ignore
    mockedStores.canvasModesStore.hasPanModeEnabled = false;
    mockedStores.settingsStore.settings.uiScale = 1.0;

    mockedStores.canvasStore.interactionsEnabled = true;
    // @ts-ignore
    mockedStores.canvasStore.viewBox = { string: "viewbox-string" };
    // @ts-ignore
    mockedStores.canvasStore.contentBounds = { left: 0, top: 0 };
    // @ts-ignore
    mockedStores.canvasStore.contentPadding = { left: 10, top: 10 };
    // @ts-ignore
    mockedStores.canvasStore.canvasSize = { width: 30, height: 300 };
    // @ts-ignore
    mockedStores.canvasStore.screenFromCanvasCoordinates = vi.fn(() => ({
      x: 1000,
      y: 1000,
    }));
    // @ts-ignore
    mockedStores.canvasStore.screenToCanvasCoordinates = vi.fn(() => [
      1000, 1000,
    ]);
    // @ts-ignore
    mockedStores.canvasStore.getCenterOfScrollContainer = vi.fn(() => ({
      x: 10,
      y: 10,
    }));

    // @ts-ignore
    mockedStores.workflowStore.isWorkflowEmpty = isWorkflowEmptyMock;

    const wrapper = shallowMount(Kanvas, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    wrapper.element.scrollTo = () => {};
    wrapper.element.setPointerCapture = setPointerCapture;
    wrapper.element.releasePointerCapture = releasePointerCapture;
    wrapper.element.scrollLeft = scrollLeft;
    wrapper.element.scrollTop = scrollTop;

    return {
      mockedStores,
      wrapper,
      setPointerCapture,
      releasePointerCapture,
      ResizeObserverMock,
      isWorkflowWritableMock,
    };
  };

  const mockGetMetaOrCtrlKey = (value: "metaKey" | "ctrlKey") => {
    vi.mocked(navigatorUtils.getMetaOrCtrlKey).mockReturnValue(value);
  };
  const mockIsMac = (value: boolean) => {
    vi.mocked(navigatorUtils.isMac).mockReturnValue(value);
  };

  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(navigatorUtils.getMetaOrCtrlKey).mockReturnValue("ctrlKey");
    vi.mocked(navigatorUtils.isMac).mockReturnValue(false);
  });

  const triggerPointerDown = async ({
    wrapper,
    position,
    pointerId,
    button,
  }) => {
    await wrapper.trigger("pointerdown", {
      button,
      screenX: position.x,
      screenY: position.y,
      pointerId,
    });
  };

  const triggerPointerMove = async ({ wrapper, position }) => {
    await wrapper.trigger("pointermove", {
      screenX: position.x,
      screenY: position.y,
    });
  };

  const triggerPointerUp = async ({ wrapper }) => {
    await wrapper.trigger("pointerup", { pointerId: -1 });
  };

  it("should make scrollContainer accessible to the store", () => {
    const { wrapper, mockedStores } = doShallowMount();
    expect(
      mockedStores.canvasStore.initScrollContainerElement,
    ).toHaveBeenCalledWith(wrapper.element);
  });

  it("should update canvas store when content bounds change", async () => {
    const { mockedStores } = doShallowMount();

    expect(
      mockedStores.canvasStore.contentBoundsChanged,
    ).not.toHaveBeenCalled();

    // @ts-ignore
    mockedStores.canvasStore.contentBounds = { left: 10, top: 10 };

    await nextTick();

    expect(mockedStores.canvasStore.contentBoundsChanged).toHaveBeenCalledWith([
      { left: 10, top: 10 },
      { left: 0, top: 0 },
    ]);
  });

  describe("selection on canvas", () => {
    it("should emit select-pointerdown when clicking on the canvas", () => {
      const { wrapper } = doShallowMount();

      wrapper.find("svg").trigger("pointerdown");

      expect($bus.emit).toHaveBeenCalledWith(
        "selection-pointerdown",
        expect.anything(),
      );
    });

    it("should emit select-pointermove when moving on the canvas ", () => {
      const { wrapper } = doShallowMount();

      wrapper.find("svg").trigger("pointermove");

      expect($bus.emit).toHaveBeenCalledWith(
        "selection-pointermove",
        expect.anything(),
      );
    });

    it("should emit select-pointerup when releasing click on the canvas ", () => {
      const { wrapper } = doShallowMount();

      wrapper.find("svg").trigger("pointerup");

      expect($bus.emit).toHaveBeenCalledWith(
        "selection-pointerup",
        expect.anything(),
      );
    });

    it("should emit select-pointerdown when pressing meta on Mac and left mouse button", async () => {
      mockGetMetaOrCtrlKey("metaKey");
      const { wrapper } = doShallowMount();
      const svg = wrapper.find("svg");
      await svg.trigger("pointerdown", {
        button: 0, // left click
        position: {
          x: 100,
          y: 100,
        },
        pointerId: -1,
        metaKey: true,
      });

      expect($bus.emit).toHaveBeenCalledWith(
        "selection-pointerdown",
        expect.anything(),
      );
    });

    it("should emit select-pointerdown when pressing control on Windows/Linux and left mouse button", async () => {
      const { wrapper } = doShallowMount();
      const svg = wrapper.find("svg");
      await svg.trigger("pointerdown", {
        button: 0, // left click
        position: {
          x: 100,
          y: 100,
        },
        pointerId: -1,
        ctrlKey: true,
      });

      expect($bus.emit).toHaveBeenCalledWith(
        "selection-pointerdown",
        expect.anything(),
      );
    });

    it("should set objects to be unmovable if meta key is down on mac", async () => {
      mockGetMetaOrCtrlKey("metaKey");
      const { mockedStores } = doShallowMount();

      document.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true }));
      await nextTick();

      expect(mockedStores.canvasStore.setIsMoveLocked).toHaveBeenCalledWith(
        true,
      );
    });

    it("should set objects to be unmovable if control key is down on windows", async () => {
      const { mockedStores } = doShallowMount();

      document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true }));
      await nextTick();

      expect(mockedStores.canvasStore.setIsMoveLocked).toHaveBeenCalledWith(
        true,
      );
    });

    it("should set objects to back to be movable if shift key is released", async () => {
      const { mockedStores } = doShallowMount();

      document.dispatchEvent(new KeyboardEvent("keydown", { shiftKey: true }));
      await nextTick();

      expect(mockedStores.canvasStore.setIsMoveLocked).toHaveBeenCalledWith(
        true,
      );
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
      await nextTick();

      expect(mockedStores.canvasStore.setIsMoveLocked).toHaveBeenCalledWith(
        false,
      );
    });
  });

  describe("panning", () => {
    describe("with space", () => {
      it.each([["input"], ["textarea"], ["select"]])(
        "should ignore space press on %s elements",
        async (elementType) => {
          const { wrapper } = doShallowMount();
          const element = document.createElement(elementType);

          document.body.appendChild(element);
          element.dispatchEvent(
            new KeyboardEvent("keypress", { code: "Space", bubbles: true }),
          );

          await nextTick();

          expect(wrapper.classes()).not.toContain("panning");
        },
      );

      it("adds and removes the panning cursor with space", async () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.classes()).not.toContain("panning");

        document.dispatchEvent(
          new KeyboardEvent("keypress", { code: "Space" }),
        );
        await nextTick();
        expect(wrapper.classes()).toContain("panning");

        document.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
        await nextTick();
        expect(wrapper.classes()).not.toContain("panning");
      });

      it("pans with space", async () => {
        const { wrapper } = doShallowMount({ scrollLeft: 100, scrollTop: 100 });

        document.dispatchEvent(
          new KeyboardEvent("keypress", { code: "Space" }),
        );
        await nextTick();

        await triggerPointerDown({
          wrapper,
          button: 0, // left click
          position: {
            x: 100,
            y: 100,
          },
          pointerId: -1,
        });

        await triggerPointerMove({ wrapper, position: { x: 90, y: 90 } });

        expect(wrapper.element.scrollLeft).toBe(110);
        expect(wrapper.element.scrollTop).toBe(110);
      });

      it("should not pan if interactionsEnabled is false", async () => {
        const { wrapper, mockedStores } = doShallowMount({
          scrollLeft: 100,
          scrollTop: 100,
        });
        mockedStores.canvasStore.interactionsEnabled = false;

        document.dispatchEvent(
          new KeyboardEvent("keypress", { code: "Space" }),
        );
        await nextTick();

        await triggerPointerDown({
          wrapper,
          button: 0, // left click
          position: {
            x: 100,
            y: 100,
          },
          pointerId: -1,
        });

        await triggerPointerMove({ wrapper, position: { x: 90, y: 90 } });

        expect(wrapper.element.scrollLeft).toBe(100);
        expect(wrapper.element.scrollTop).toBe(100);
      });
    });

    describe("with middle mouse button click", () => {
      it("pans with middle mouse button", async () => {
        const {
          wrapper,
          setPointerCapture,
          releasePointerCapture,
          mockedStores,
        } = doShallowMount({
          scrollLeft: 100,
          scrollTop: 100,
        });

        await triggerPointerDown({
          wrapper,
          button: 1, // middle
          position: {
            x: 100,
            y: 100,
          },
          pointerId: -1,
        });
        expect(setPointerCapture).toHaveBeenCalledWith(-1);

        expect(wrapper.classes()).toContain("panning");

        await triggerPointerMove({ wrapper, position: { x: 90, y: 90 } });

        expect(wrapper.classes()).toContain("panning");
        expect(wrapper.element.scrollLeft).toBe(110);
        expect(wrapper.element.scrollTop).toBe(110);

        await triggerPointerUp({ wrapper });
        expect(releasePointerCapture).toHaveBeenCalledWith(-1);
        expect(
          mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
        ).not.toHaveBeenCalled();
      });

      it("should not pan if interactionsEnabled is false", async () => {
        const { wrapper, mockedStores } = doShallowMount();
        mockedStores.canvasStore.interactionsEnabled = false;

        wrapper.element.setPointerCapture = vi.fn();
        wrapper.element.releasePointerCapture = vi.fn();

        wrapper.element.scrollLeft = 100;
        wrapper.element.scrollTop = 100;
        await triggerPointerDown({
          wrapper,
          button: 1, // middle
          position: {
            x: 100,
            y: 100,
          },
          pointerId: -1,
        });

        expect(wrapper.element.setPointerCapture).not.toHaveBeenCalled();
        expect(wrapper.classes()).not.toContain("panning");
      });
    });

    describe("with right mouse button click", () => {
      it("pans with right mouse button if mouse movement threshold is exceeded", async () => {
        const {
          wrapper,
          setPointerCapture,
          releasePointerCapture,
          mockedStores,
        } = doShallowMount({
          scrollLeft: 100,
          scrollTop: 100,
        });

        await triggerPointerDown({
          wrapper,
          button: 2, // right
          position: {
            x: 100,
            y: 100,
          },
          pointerId: -1,
        });
        expect(setPointerCapture).not.toHaveBeenCalled();

        expect(wrapper.classes()).not.toContain("panning");

        // we need (1) a larger delta to trigger the move with right click
        // and (2) to trigger the event more than once to make sure the right-click panned is triggered
        // since the first time it only validates that the move threshold is exceeded
        await triggerPointerMove({ wrapper, position: { x: 190, y: 190 } });
        await triggerPointerMove({ wrapper, position: { x: 200, y: 200 } });

        expect(wrapper.classes()).toContain("panning");

        expect(wrapper.element.scrollLeft).toBe(90);
        expect(wrapper.element.scrollTop).toBe(90);

        await triggerPointerUp({ wrapper });
        expect(releasePointerCapture).toHaveBeenCalledWith(-1);
        expect(
          mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
        ).not.toHaveBeenCalled();
      });

      it("does not pan and opens the context menu if mouse movement threshold is not exceeded", async () => {
        const { wrapper, releasePointerCapture, mockedStores } = doShallowMount(
          {
            scrollLeft: 100,
            scrollTop: 100,
          },
        );

        await triggerPointerDown({
          wrapper,
          button: 2, // right
          position: {
            x: 100,
            y: 100,
          },
          pointerId: -1,
        });

        // we need (1) a small delta to trigger
        // and (2) to trigger the event more than once to make sure the right-click panned is triggered
        // and make sure the threshold is validated
        await triggerPointerMove({ wrapper, position: { x: 90, y: 90 } });
        await triggerPointerMove({ wrapper, position: { x: 91, y: 91 } });

        expect(wrapper.classes()).not.toContain("panning");

        expect(wrapper.element.scrollLeft).toBe(100);
        expect(wrapper.element.scrollTop).toBe(100);

        await triggerPointerUp({ wrapper });
        expect(releasePointerCapture).not.toHaveBeenCalledWith(-1);
        expect(
          mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
        ).toHaveBeenCalled();
      });

      it("should not pan if interactionsEnabled is false", async () => {
        const {
          wrapper,
          setPointerCapture,
          releasePointerCapture,
          mockedStores,
        } = doShallowMount({
          scrollLeft: 100,
          scrollTop: 100,
        });

        mockedStores.canvasStore.interactionsEnabled = false;

        await triggerPointerDown({
          wrapper,
          button: 2, // right
          position: {
            x: 100,
            y: 100,
          },
          pointerId: -1,
        });
        expect(setPointerCapture).not.toHaveBeenCalled();

        expect(wrapper.classes()).not.toContain("panning");

        // we need (1) a larger delta to trigger the move with right click
        // and (2) to trigger the event more than once to make sure the right-click panned is triggered
        // since the first time it only validates that the move threshold is exceeded
        await triggerPointerMove({ wrapper, position: { x: 190, y: 190 } });
        await triggerPointerMove({ wrapper, position: { x: 200, y: 200 } });

        expect(wrapper.classes()).not.toContain("panning");

        expect(wrapper.element.scrollLeft).toBe(100);
        expect(wrapper.element.scrollTop).toBe(100);

        await triggerPointerUp({ wrapper });
        expect(releasePointerCapture).not.toHaveBeenCalledWith(-1);
        expect(
          mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
        ).not.toHaveBeenCalled();
      });
    });

    it("does not pan if workflow is empty", () => {
      const { wrapper, setPointerCapture } = doShallowMount({
        isWorkflowEmptyMock: true,
      });

      wrapper.element.scrollLeft = 100;
      wrapper.element.scrollTop = 100;
      wrapper.trigger("pointerdown", {
        button: 1, // middle
        screenX: 100,
        screenY: 100,
        pointerId: -1,
      });

      expect(setPointerCapture).not.toHaveBeenCalled();
      expect(wrapper.classes()).not.toContain("panning");
    });
  });

  describe("context Menu", () => {
    it("shows context menu if user has not panned and used right mouse button", async () => {
      const { wrapper, mockedStores } = doShallowMount();

      await triggerPointerDown({
        wrapper,
        button: 2, // right
        position: {
          x: 100,
          y: 100,
        },
        pointerId: -1,
      });

      await triggerPointerUp({ wrapper });

      expect(
        mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          deselectAllObjects: true,
          event: expect.anything(),
        }),
      );
    });

    it("allows native context menu if source element allows it", async () => {
      const { wrapper } = doShallowMount();
      const preventDefault = vi.fn();
      wrapper.element.classList.add("native-context-menu");
      await wrapper.trigger("contextmenu", { preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it("opens contextmenu (via native event) if the workflow is empty", async () => {
      const { wrapper, mockedStores } = doShallowMount({
        isWorkflowEmptyMock: true,
      });
      await wrapper.trigger("contextmenu");
      expect(
        mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
      ).toHaveBeenCalledWith(expect.anything());
    });

    it("opens contextmenu with SHIFT+F10", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      await wrapper.trigger("keydown", { key: "F10", shiftKey: true });
      expect(
        mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
      ).toHaveBeenCalledWith(expect.anything());
    });

    it("left click with control on Mac opens context menu", async () => {
      mockIsMac(true);
      const { wrapper, mockedStores } = doShallowMount();
      await wrapper.trigger("pointerdown", { button: 0, ctrlKey: true });
      expect(
        mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
      ).toHaveBeenCalledWith(expect.anything());
      expect(mockedStores.selectionStore.deselectAllObjects).toHaveBeenCalled();
    });

    it("opens contextmenu via context menu key (regardless of empty state)", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      await wrapper.trigger("keydown", { key: "ContextMenu" });
      expect(
        mockedStores.canvasAnchoredComponentsStore.toggleContextMenu,
      ).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe("container Resize", () => {
    it("should observe container resizes", async () => {
      vi.useFakeTimers();
      const { wrapper, mockedStores, ResizeObserverMock } = doShallowMount();

      ResizeObserverMock.__trigger__();
      ResizeObserverMock.__trigger__();

      vi.advanceTimersByTime(RESIZE_DEBOUNCE);
      await nextTick();

      expect(wrapper.emitted("containerSizeChanged")).toBeTruthy();
      expect(
        mockedStores.canvasStore.updateContainerSize,
      ).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("should disconnect resize observer", () => {
      const { wrapper, ResizeObserverMock } = doShallowMount();
      wrapper.unmount();
      expect(ResizeObserverMock.disconnect).toHaveBeenCalled();
    });
  });

  describe("zooming", () => {
    it("uses canvasSize and viewBox from store", async () => {
      const { wrapper, mockedStores } = doShallowMount();
      await nextTick();

      const svg = wrapper.find("svg");

      const { canvasSize } = mockedStores.canvasStore;
      expect(Number(svg.attributes("width"))).toBe(canvasSize.width);
      expect(Number(svg.attributes("height"))).toBe(canvasSize.height);

      const { viewBox: viewBoxString } = mockedStores.canvasStore;

      expect(svg.attributes("viewBox")).toBe(viewBoxString.string);
    });

    it("should zoom when using mouse wheel", () => {
      const { wrapper, mockedStores } = doShallowMount();

      wrapper.element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -5,
          ctrlKey: true,
          clientX: 10,
          clientY: 10,
        }),
      );
      expect(mockedStores.canvasStore.zoomAroundPointer).toHaveBeenCalledWith({
        delta: 1,
        cursorX: 5,
        cursorY: 0,
      });
    });

    it("does not zoom on mouse wheel if interactionsEnabled is false", () => {
      const { wrapper, mockedStores } = doShallowMount();
      mockedStores.canvasStore.interactionsEnabled = false;

      wrapper.element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -5,
          ctrlKey: true,
          clientX: 10,
          clientY: 10,
        }),
      );
      expect(mockedStores.canvasStore.zoomAroundPointer).not.toHaveBeenCalled();
    });

    it("does not zoom on mouse wheel if workflow is empty", () => {
      const { wrapper, mockedStores } = doShallowMount({
        isWorkflowEmptyMock: true,
      });

      wrapper.element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -5,
          ctrlKey: true,
          clientX: 10,
          clientY: 10,
        }),
      );
      expect(mockedStores.canvasStore.zoomAroundPointer).not.toHaveBeenCalled();
    });
  });

  describe("arrow key navigation", () => {
    const emitEvent = (
      wrapper: VueWrapper<any>,
      name: "keydown" | "keyup",
      key:
        | "ArrowUp"
        | "ArrowDown"
        | "ArrowLeft"
        | "ArrowRight"
        | "Enter"
        | "Control"
        | "Shift",
      shiftKey = false,
      ctrlKey = false,
      // eslint-disable-next-line max-params
    ) => {
      wrapper.trigger(name, { key, ctrlKey, shiftKey });
    };

    afterEach(() => {
      vi.clearAllMocks();
    });

    const mountWithWorkflow = () => {
      const mountResult = doShallowMount({});

      const node1 = createNativeNode({
        id: "root:1",
        position: { x: 10, y: 10 },
      });
      const node2 = createNativeNode({
        id: "root:2",
        position: { x: 20, y: 10 },
      });
      const annotation1 = createWorkflowAnnotation({
        id: "annotation:1",
        bounds: { x: 40, y: 10, width: 20, height: 20 },
      });
      const workflow = createWorkflow({
        nodes: {
          [node1.id]: node1,
          [node2.id]: node2,
        },
        workflowAnnotations: [annotation1],
      });
      mountResult.mockedStores.workflowStore.setActiveWorkflow(workflow);

      return { ...mountResult, workflow, node1, node2, annotation1 };
    };

    describe("arrow key selection", () => {
      const mocked = mockedObject(workflowNavigationService);

      const mockNearestObject = (value) => {
        mocked.nearestObject.mockResolvedValueOnce(value);
      };

      it("should move focus to near node when multiselection is used and focus was already active", async () => {
        const { node1, node2, wrapper, mockedStores } = mountWithWorkflow();
        const firstNodeObject = createWorkflowObject(node1);
        const secondNodeObject = createWorkflowObject(node2);

        mockedStores.selectionStore.focusedObject = firstNodeObject;

        mockNearestObject(secondNodeObject);

        emitEvent(wrapper, "keydown", "ArrowRight", true);

        await flushPromises();

        expect(mocked.nearestObject).toHaveBeenCalledOnce();
        expect(mockedStores.selectionStore.focusedObject).toEqual(
          secondNodeObject,
        );
        expect(mockedStores.canvasStore.scroll).toHaveBeenCalled();
      });

      it("should activate focus if it's not active and multiselection is used", async () => {
        const { node1, node2, wrapper, mockedStores } = mountWithWorkflow();
        const firstNodeObject = createWorkflowObject(node1);
        const secondNodeObject = createWorkflowObject(node2);

        const reset = () => {
          mockedStores.selectionStore.unfocusObject();
          mockedStores.selectionStore.deselectAllObjects();
        };

        mockNearestObject(secondNodeObject);

        emitEvent(wrapper, "keydown", "ArrowRight", true);
        await flushPromises();

        // ----------------------- //
        // no selection and no focus, item will be selected
        expect(mocked.nearestObject).not.toHaveBeenCalled();
        expect(mockedStores.canvasStore.scroll).not.toHaveBeenCalled();

        // ----------------------- //
        // single item selected, should get focus
        mockedStores.selectionStore.selectNode(node1.id);

        emitEvent(wrapper, "keydown", "ArrowRight", true);
        await flushPromises();

        expect(mockedStores.selectionStore.focusedObject).toEqual(
          firstNodeObject,
        );
        expect(mockedStores.canvasStore.scroll).toHaveBeenCalled();

        // ----------------------- //
        // reset focus and select multiple items, go "right"
        reset();
        mockedStores.selectionStore.selectNode(node1.id);
        mockedStores.selectionStore.selectNode(node2.id);

        emitEvent(wrapper, "keydown", "ArrowRight", true);
        await flushPromises();

        expect(mockedStores.selectionStore.focusedObject).toEqual(
          secondNodeObject,
        );

        // ----------------------- //
        // reset focus and select multiple items, go "left"
        reset();
        mockedStores.selectionStore.selectNode(node1.id);
        mockedStores.selectionStore.selectNode(node2.id);

        emitEvent(wrapper, "keydown", "ArrowLeft", true);
        await flushPromises();

        expect(mockedStores.selectionStore.focusedObject).toEqual(
          firstNodeObject,
        );
        expect(mockedStores.canvasStore.scroll).toHaveBeenCalled();
      });

      it("should select next nearest object when single object is selected and not using multi-select", async () => {
        const { node1, node2, wrapper, mockedStores } =
          mountWithWorkflow(false);

        mockedStores.selectionStore.selectSingleObject({
          type: "node",
          id: node1.id,
        });
        emitEvent(wrapper, "keydown", "ArrowRight", false);
        await flushPromises();

        expect(mockedStores.selectionStore.selectedNodes).toStrictEqual({
          [node2.id]: true,
        });
        expect(mockedStores.selectionStore.unfocusObject).toHaveBeenCalled();
      });

      it("should select next nearest object when selection is empty but one object has focus AND not using multi-select", async () => {
        const { node1, annotation1, wrapper, mockedStores } =
          mountWithWorkflow();
        const nodeObject = createWorkflowObject(node1);
        const annotationObject = createWorkflowObject(annotation1);

        mockNearestObject(annotationObject);
        mockedStores.selectionStore.focusedObject = nodeObject;

        emitEvent(wrapper, "keydown", "ArrowRight", false);
        await flushPromises();

        expect(mockedStores.selectionStore.selectedNodes).toStrictEqual({});
        expect(mockedStores.selectionStore.selectedAnnotations).toStrictEqual({
          [annotation1.id]: true,
        });
        expect(mockedStores.selectionStore.unfocusObject).toHaveBeenCalled();
      });

      it("should escape multiselection state when arrow key is used without multi-select modifier", async () => {
        const { mockedStores, node1, node2, annotation1, wrapper } =
          mountWithWorkflow();

        // Go right
        mockedStores.selectionStore.selectNode(node1.id);
        mockedStores.selectionStore.selectNode(node2.id);
        mockedStores.selectionStore.selectAnnotation(annotation1.id);

        emitEvent(wrapper, "keydown", "ArrowRight", false);
        await flushPromises();

        expect(mockedStores.selectionStore.selectedNodes).toStrictEqual({});
        expect(mockedStores.selectionStore.selectedAnnotations).toStrictEqual({
          [annotation1.id]: true,
        });

        // Go left
        mockedStores.selectionStore.selectNode(node1.id);
        mockedStores.selectionStore.selectNode(node2.id);
        mockedStores.selectionStore.selectAnnotation(annotation1.id);

        emitEvent(wrapper, "keydown", "ArrowLeft", false);
        await flushPromises();

        expect(mockedStores.selectionStore.selectedNodes).toStrictEqual({
          [node1.id]: true,
        });
        expect(mockedStores.selectionStore.selectedAnnotations).toStrictEqual(
          {},
        );
      });

      it("should add/remove from selection by pressing 'Enter'", async () => {
        const { mockedStores, node1, annotation1, wrapper } =
          mountWithWorkflow();

        const nodeObject = createWorkflowObject(node1);
        const annotationObject = createWorkflowObject(annotation1);
        mockNearestObject(annotationObject);

        mockedStores.selectionStore.selectNode(node1.id);

        expect(mockedStores.selectionStore.focusedObject).toBeFalsy();

        emitEvent(wrapper, "keydown", "ArrowRight", true);
        await flushPromises();

        expect(mockedStores.selectionStore.focusedObject).toEqual(nodeObject);

        emitEvent(wrapper, "keydown", "ArrowRight", true);
        await flushPromises();

        expect(mockedStores.selectionStore.focusedObject).toEqual(
          annotationObject,
        );

        emitEvent(wrapper, "keydown", "Enter", true);
        await flushPromises();

        expect(mockedStores.selectionStore.selectedNodes).toStrictEqual({
          [node1.id]: true,
        });
        expect(mockedStores.selectionStore.selectedAnnotations).toStrictEqual({
          [annotation1.id]: true,
        });

        emitEvent(wrapper, "keydown", "Enter", true);
        await flushPromises();
        expect(mockedStores.selectionStore.selectedNodes).toStrictEqual({
          [node1.id]: true,
        });
        expect(mockedStores.selectionStore.selectedAnnotations).toStrictEqual(
          {},
        );
      });
    });

    describe("arrow key movement", () => {
      it("should move object with arrow keys", async () => {
        const { mockedStores, node1, node2, wrapper } = mountWithWorkflow();

        mockedStores.selectionStore.selectNode(node1.id);
        mockedStores.selectionStore.selectNode(node2.id);

        emitEvent(wrapper, "keydown", "Control", true, true);
        emitEvent(wrapper, "keydown", "Shift", true, true);
        emitEvent(wrapper, "keydown", "ArrowRight", true, true);

        await flushPromises();

        expect(mockedStores.workflowStore.setTooltip).toHaveBeenCalledWith(
          null,
        );
        expect(mockedStores.movingStore.setIsDragging).toHaveBeenCalledWith(
          true,
        );
        expect(
          mockedStores.movingStore.setMovePreview,
        ).toHaveBeenLastCalledWith({
          deltaX: 5,
          deltaY: 0,
        });
        expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();

        emitEvent(wrapper, "keydown", "Control", true, true);
        emitEvent(wrapper, "keydown", "Shift", true, true);
        emitEvent(wrapper, "keydown", "ArrowUp", true, true);

        await flushPromises();

        expect(
          mockedStores.movingStore.setMovePreview,
        ).toHaveBeenLastCalledWith({
          deltaX: 5,
          deltaY: -5,
        });
        expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();

        emitEvent(wrapper, "keyup", "Control");
        await flushPromises();
        expect(mockedStores.movingStore.moveObjects).toHaveBeenCalled();
      });

      it("should not move objects if workflow is not writable", async () => {
        const { mockedStores, node1, wrapper } = mountWithWorkflow();

        // @ts-ignore
        mockedStores.workflowStore.isWritable = false;
        await nextTick();

        mockedStores.selectionStore.selectNode(node1.id);

        emitEvent(wrapper, "keydown", "Control", true, true);
        emitEvent(wrapper, "keydown", "Shift", true, true);
        emitEvent(wrapper, "keydown", "ArrowRight", true, true);

        await flushPromises();

        expect(mockedStores.movingStore.setIsDragging).not.toHaveBeenCalled();
        expect(mockedStores.movingStore.setMovePreview).not.toHaveBeenCalled();
        expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();

        emitEvent(wrapper, "keyup", "Control");
        await flushPromises();
        expect(mockedStores.movingStore.moveObjects).not.toHaveBeenCalled();
      });
    });
  });

  describe("initial focus", () => {
    const mocked = mockedObject(workflowNavigationService);

    const mockNearestObject = (value) => {
      mocked.nearestObject.mockResolvedValueOnce(value);
    };

    const mountWithWorkflowButNoSelection = () => {
      const mountResult = doShallowMount();

      const node1 = createNativeNode({
        id: "root:1",
        position: { x: 10, y: 10 },
      });
      const node2 = createNativeNode({
        id: "root:2",
        position: { x: 20, y: 10 },
      });
      const annotation1 = createWorkflowAnnotation({
        id: "annotation:1",
        bounds: { x: 40, y: 10, width: 20, height: 20 },
      });
      const workflow = createWorkflow({
        nodes: {
          [node1.id]: node1,
          [node2.id]: node2,
        },
        workflowAnnotations: [annotation1],
      });
      mountResult.mockedStores.workflowStore.setActiveWorkflow(workflow);
      mountResult.mockedStores.selectionStore.clearSelection();

      return { ...mountResult, workflow, node1, node2, annotation1 };
    };

    it("should select first object on keyboard focus", async () => {
      const { node1, wrapper, mockedStores } =
        mountWithWorkflowButNoSelection();
      const firstNodeObject = createWorkflowObject(node1);

      mockNearestObject(firstNodeObject);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await wrapper.trigger("focusin");

      expect(mockedStores.selectionStore.selectNode).toHaveBeenCalledWith(
        firstNodeObject.id,
      );
    });

    it("should not select first object on mouse focus", async () => {
      const { node1, wrapper, mockedStores } =
        mountWithWorkflowButNoSelection();
      const firstNodeObject = createWorkflowObject(node1);

      mockNearestObject(firstNodeObject);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await nextTick();

      document.dispatchEvent(new Event("pointerdown"));
      await nextTick();

      await wrapper.trigger("focusin");

      expect(mockedStores.selectionStore.selectNode).not.toHaveBeenCalledWith(
        firstNodeObject.id,
      );
    });

    it("should deselect all objects on escape", async () => {
      const { node1, wrapper, mockedStores } =
        mountWithWorkflowButNoSelection();

      mockedStores.selectionStore.selectNode(node1.id);

      await wrapper.trigger("keydown", { key: "Escape" });

      expect(mockedStores.selectionStore.deselectAllObjects).toHaveBeenCalled();
    });

    it("should not select anything if something is already selected", async () => {
      const { node1, node2, wrapper, mockedStores } =
        mountWithWorkflowButNoSelection();
      const firstNodeObject = createWorkflowObject(node1);

      mockedStores.selectionStore.selectNode(node2.id);
      mockNearestObject(firstNodeObject);

      vi.mocked(mockedStores.selectionStore.selectNode).mockClear();

      await wrapper.trigger("focusin");

      expect(
        mockedStores.selectionStore.selectAnnotation,
      ).not.toHaveBeenCalled();
      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).not.toHaveBeenCalled();
      expect(mockedStores.selectionStore.selectNode).not.toHaveBeenCalled();
      expect(mockedStores.selectionStore.selectNodes).not.toHaveBeenCalled();
    });

    it.each(["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"])(
      "should select an objects on %s key",
      async (key) => {
        const { wrapper, mockedStores } = mountWithWorkflowButNoSelection();

        await wrapper.trigger("keydown", { key });

        expect(mockedStores.selectionStore.selectNode).toHaveBeenCalledWith(
          "root:1",
        );
      },
    );
  });
});
