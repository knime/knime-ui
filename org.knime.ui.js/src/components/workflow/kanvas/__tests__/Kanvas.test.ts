/* eslint-disable max-lines */
import { expect, describe, it, vi, afterEach } from "vitest";
import * as Vue from "vue";
import { VueWrapper, flushPromises, shallowMount } from "@vue/test-utils";
import { mockUserAgent } from "jest-useragent-mock";

import { mockVuexStore } from "@/test/utils/mockVuexStore";
import { $bus } from "@/plugins/event-bus";

import { workflowNavigationService } from "@/util/workflowNavigationService";

import * as selectionStore from "@/store/selection";
import * as workflowStore from "@/store/workflow";

import Kanvas from "../Kanvas.vue";
import {
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
  createWorkflowObject,
} from "@/test/factories";
import { mockedObject } from "@/test/utils";
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

describe("Kanvas", () => {
  const doShallowMount = ({
    isWorkflowEmptyMock = vi.fn().mockReturnValue(false),
    isDraggingNode = false,
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

    const actions = {
      canvas: {
        zoomAroundPointer: vi.fn(),
        updateContainerSize: vi.fn(),
        contentBoundsChanged: vi.fn(),
        initScrollContainerElement: vi
          .fn()
          .mockImplementation(({ state }, el) => {
            state.getScrollContainerElement = () => el;
          }),
        scroll: vi.fn(),
      },
      application: {
        toggleContextMenu: vi.fn(),
      },
    };

    const isWorkflowWritableMock = vi.fn(() => true);
    const storeConfig = {
      application: {
        actions: actions.application,
        getters: {
          hasPanModeEnabled: () => false,
        },
      },
      canvas: {
        state: {
          getScrollContainerElement: null,
          zoomFactor: 1,
          suggestPanning: false,
          // mock implementation of contentBounds for testing watcher
          __contentBounds: { left: 0, top: 0 },
          interactionsEnabled: true,
        },
        getters: {
          viewBox: () => ({ string: "viewbox-string" }),
          contentBounds: (state) => state.__contentBounds,
          contentPadding: () => ({ left: 10, top: 10 }),
          canvasSize: () => ({ width: 30, height: 300 }),
          screenFromCanvasCoordinates: () =>
            vi.fn(() => ({ x: 1000, y: 1000 })),
          screenToCanvasCoordinates: () => vi.fn(() => [1000, 1000]),
        },
        actions: actions.canvas,
        mutations: {
          clearScrollContainerElement: vi.fn(),
          setSuggestPanning: vi.fn(),
          setIsMoveLocked: vi.fn(),
        },
      },
      workflow: {
        ...workflowStore,
        actions: {
          ...workflowStore.actions,
          moveObjects: vi.fn(),
        },
        getters: {
          ...workflowStore.getters,
          isWorkflowEmpty: isWorkflowEmptyMock,
          isWritable: isWorkflowWritableMock,
        },
      },
      nodeRepository: {
        state: {
          isDraggingNode,
        },
      },
      selection: selectionStore,
    };

    const $store = mockVuexStore(storeConfig);

    const commitSpy = vi.spyOn($store, "commit");
    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = shallowMount(Kanvas, {
      global: {
        plugins: [$store],
      },
    });

    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    wrapper.element.setPointerCapture = setPointerCapture;
    wrapper.element.releasePointerCapture = releasePointerCapture;
    wrapper.element.scrollLeft = scrollLeft;
    wrapper.element.scrollTop = scrollTop;

    return {
      $store,
      wrapper,
      actions,
      setPointerCapture,
      releasePointerCapture,
      ResizeObserverMock,
      commitSpy,
      dispatchSpy,
      isWorkflowWritableMock,
    };
  };

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
    const { wrapper, actions } = doShallowMount();
    expect(actions.canvas.initScrollContainerElement).toHaveBeenCalledWith(
      expect.anything(),
      wrapper.element,
    );
  });

  it("should update canvas store when content bounds change", async () => {
    const { actions, $store } = doShallowMount();

    expect(actions.canvas.contentBoundsChanged).not.toHaveBeenCalled();

    $store.state.canvas.__contentBounds = { left: 10, top: 10 };

    await Vue.nextTick();

    expect(actions.canvas.contentBoundsChanged).toHaveBeenCalledWith(
      expect.anything(),
      [{ left: 10, top: 10 }, { left: 0, top: 0 }, expect.anything()],
    );
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
      mockUserAgent("mac");
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
      mockUserAgent("windows");
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
      mockUserAgent("mac");
      const { commitSpy } = doShallowMount();

      document.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true }));
      await Vue.nextTick();

      expect(commitSpy).toHaveBeenCalledWith("canvas/setIsMoveLocked", true);
    });

    it("should set objects to be unmovable if control key is down on windows", async () => {
      mockUserAgent("windows");
      const { commitSpy } = doShallowMount();

      document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true }));
      await Vue.nextTick();

      expect(commitSpy).toHaveBeenCalledWith("canvas/setIsMoveLocked", true);
    });

    it("should set objects to back to be movable if shift key is released", async () => {
      const { commitSpy } = doShallowMount();

      document.dispatchEvent(new KeyboardEvent("keydown", { shiftKey: true }));
      await Vue.nextTick();

      expect(commitSpy).toHaveBeenCalledWith("canvas/setIsMoveLocked", true);

      document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
      await Vue.nextTick();

      expect(commitSpy).toHaveBeenCalledWith("canvas/setIsMoveLocked", false);
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

          await Vue.nextTick();

          expect(wrapper.classes()).not.toContain("panning");
        },
      );

      it("adds and removes the panning cursor with space", async () => {
        const { wrapper } = doShallowMount();

        expect(wrapper.classes()).not.toContain("panning");

        document.dispatchEvent(
          new KeyboardEvent("keypress", { code: "Space" }),
        );
        await Vue.nextTick();
        expect(wrapper.classes()).toContain("panning");

        document.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
        await Vue.nextTick();
        expect(wrapper.classes()).not.toContain("panning");
      });

      it("pans with space", async () => {
        const { wrapper } = doShallowMount({ scrollLeft: 100, scrollTop: 100 });

        document.dispatchEvent(
          new KeyboardEvent("keypress", { code: "Space" }),
        );
        await Vue.nextTick();

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
        const { wrapper, $store } = doShallowMount({
          scrollLeft: 100,
          scrollTop: 100,
        });
        $store.state.canvas.interactionsEnabled = false;

        document.dispatchEvent(
          new KeyboardEvent("keypress", { code: "Space" }),
        );
        await Vue.nextTick();

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
        const { wrapper, setPointerCapture, releasePointerCapture, actions } =
          doShallowMount({
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
        expect(actions.application.toggleContextMenu).not.toHaveBeenCalled();
      });

      it("should not pan if interactionsEnabled is false", async () => {
        const { wrapper, $store } = doShallowMount();
        $store.state.canvas.interactionsEnabled = false;

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
        const { wrapper, setPointerCapture, releasePointerCapture, actions } =
          doShallowMount({
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
        expect(actions.application.toggleContextMenu).not.toHaveBeenCalled();
      });

      it("does not pan and opens the context menu if mouse movement threshold is not exceeded", async () => {
        const { wrapper, releasePointerCapture, actions } = doShallowMount({
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
        expect(actions.application.toggleContextMenu).toHaveBeenCalled();
      });

      it("should not pan if interactionsEnabled is false", async () => {
        const {
          wrapper,
          setPointerCapture,
          releasePointerCapture,
          actions,
          $store,
        } = doShallowMount({
          scrollLeft: 100,
          scrollTop: 100,
        });

        $store.state.canvas.interactionsEnabled = false;

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
        expect(actions.application.toggleContextMenu).not.toHaveBeenCalled();
      });
    });

    it("does not pan if workflow is empty", () => {
      const { wrapper, setPointerCapture } = doShallowMount({
        isWorkflowEmptyMock: vi.fn().mockReturnValue(true),
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
      const { wrapper, actions } = doShallowMount();

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

      expect(actions.application.toggleContextMenu).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deselectAllObjects: true,
          event: expect.anything(),
        }),
      );
    });
  });

  describe("container Resize", () => {
    it("should observe container resizes", async () => {
      vi.useFakeTimers();
      const { wrapper, actions, ResizeObserverMock } = doShallowMount();

      ResizeObserverMock.__trigger__();
      ResizeObserverMock.__trigger__();

      vi.advanceTimersByTime(RESIZE_DEBOUNCE);
      await Vue.nextTick();

      expect(wrapper.emitted("containerSizeChanged")).toBeTruthy();
      expect(actions.canvas.updateContainerSize).toHaveBeenCalledTimes(1);

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
      const { wrapper, $store } = doShallowMount();
      await Vue.nextTick();

      const svg = wrapper.find("svg");

      const canvasSize = $store.getters["canvas/canvasSize"];
      expect(Number(svg.attributes("width"))).toBe(canvasSize.width);
      expect(Number(svg.attributes("height"))).toBe(canvasSize.height);

      const viewBoxString = $store.getters["canvas/viewBox"].string;

      expect(svg.attributes("viewBox")).toBe(viewBoxString);
    });

    it("should zoom when using mouse wheel", () => {
      const { wrapper, actions } = doShallowMount();

      wrapper.element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -5,
          ctrlKey: true,
          clientX: 10,
          clientY: 10,
        }),
      );
      expect(actions.canvas.zoomAroundPointer).toHaveBeenCalledWith(
        expect.anything(),
        {
          delta: 1,
          cursorX: 5,
          cursorY: 0,
        },
      );
    });

    it("does not zoom on mouse wheel if interactionsEnabled is false", () => {
      const { wrapper, actions, $store } = doShallowMount();
      $store.state.canvas.interactionsEnabled = false;

      wrapper.element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -5,
          ctrlKey: true,
          clientX: 10,
          clientY: 10,
        }),
      );
      expect(actions.canvas.zoomAroundPointer).not.toHaveBeenCalled();
    });

    it("does not zoom on mouse wheel if workflow is empty", () => {
      const { wrapper, actions } = doShallowMount({
        isWorkflowEmptyMock: vi.fn().mockReturnValue(true),
      });

      wrapper.element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -5,
          ctrlKey: true,
          clientX: 10,
          clientY: 10,
        }),
      );
      expect(actions.canvas.zoomAroundPointer).not.toHaveBeenCalled();
    });
  });

  describe("arrow key navigation", () => {
    let wrapperRef: VueWrapper<any> | null = null;

    const emitEvent = (
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
    ) => {
      const event = new KeyboardEvent(name, { key, shiftKey, ctrlKey });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
    };

    afterEach(() => {
      vi.clearAllMocks();

      // events are added to the window and document in this component
      // which means we need to unmount it after every test to clear those events
      if (wrapperRef) {
        wrapperRef.unmount();
        wrapperRef = null;
      }
    });

    const mountWithWorkflow = () => {
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
      mountResult.$store.commit("workflow/setActiveWorkflow", workflow);

      return { ...mountResult, workflow, node1, node2, annotation1 };
    };

    describe("arrow key selection", () => {
      const mocked = mockedObject(workflowNavigationService);

      const mockNearestObject = (value) => {
        mocked.nearestObject.mockResolvedValueOnce(value);
      };

      it("should move focus to near node when multiselection is used and focus was already active", async () => {
        const { $store, node1, node2, wrapper, actions } = mountWithWorkflow();
        const firstNodeObject = createWorkflowObject(node1);
        const secondNodeObject = createWorkflowObject(node2);

        $store.state.selection.focusedObject = firstNodeObject;

        mockNearestObject(secondNodeObject);

        emitEvent("keydown", "ArrowRight", true);

        await flushPromises();

        expect(mocked.nearestObject).toHaveBeenCalledOnce();
        expect($store.state.selection.focusedObject).toEqual(secondNodeObject);
        expect(actions.canvas.scroll).toHaveBeenCalled();

        wrapperRef = wrapper;
      });

      it("should activate focus if it's not active and multiselection is used", async () => {
        const { $store, node1, node2, wrapper, actions } = mountWithWorkflow();
        const firstNodeObject = createWorkflowObject(node1);
        const secondNodeObject = createWorkflowObject(node2);

        const reset = async () => {
          $store.commit("selection/unfocusObject");
          await $store.dispatch("selection/deselectAllObjects");
        };

        mockNearestObject(secondNodeObject);

        emitEvent("keydown", "ArrowRight", true);
        await flushPromises();

        // ----------------------- //
        // no selection and no focus, nothing happens
        expect(mocked.nearestObject).not.toHaveBeenCalled();
        expect(actions.canvas.scroll).not.toHaveBeenCalled();

        // ----------------------- //
        // single item selected, should get focus
        await $store.dispatch("selection/selectNode", node1.id);

        emitEvent("keydown", "ArrowRight", true);
        await flushPromises();

        expect($store.state.selection.focusedObject).toEqual(firstNodeObject);
        expect(actions.canvas.scroll).toHaveBeenCalled();

        // ----------------------- //
        // reset focus and select multiple items, go "right"
        await reset();
        await $store.dispatch("selection/selectNode", node1.id);
        await $store.dispatch("selection/selectNode", node2.id);

        emitEvent("keydown", "ArrowRight", true);
        await flushPromises();

        expect($store.state.selection.focusedObject).toEqual(secondNodeObject);

        // ----------------------- //
        // reset focus and select multiple items, go "left"
        await reset();
        await $store.dispatch("selection/selectNode", node1.id);
        await $store.dispatch("selection/selectNode", node2.id);

        emitEvent("keydown", "ArrowLeft", true);
        await flushPromises();

        expect($store.state.selection.focusedObject).toEqual(firstNodeObject);
        expect(actions.canvas.scroll).toHaveBeenCalled();

        wrapperRef = wrapper;
      });

      it("should select next nearest object when single object is selected and not using multi-select", async () => {
        const { $store, node1, node2, wrapper, commitSpy } =
          mountWithWorkflow();

        await $store.dispatch("selection/selectNode", node1.id);
        emitEvent("keydown", "ArrowRight", false);
        await flushPromises();

        expect($store.state.selection.selectedNodes).toStrictEqual({
          [node2.id]: true,
        });
        expect(commitSpy).toHaveBeenCalledWith("selection/unfocusObject");
        wrapperRef = wrapper;
      });

      it("should select next nearest object when selection is empty but one object has focus AND not using multi-select", async () => {
        const { $store, node1, annotation1, wrapper, commitSpy } =
          mountWithWorkflow();
        const nodeObject = createWorkflowObject(node1);
        const annotationObject = createWorkflowObject(annotation1);

        mockNearestObject(annotationObject);
        $store.state.selection.focusedObject = nodeObject;

        emitEvent("keydown", "ArrowRight", false);
        await flushPromises();

        expect($store.state.selection.selectedNodes).toStrictEqual({});
        expect($store.state.selection.selectedAnnotations).toStrictEqual({
          [annotation1.id]: true,
        });
        expect(commitSpy).toHaveBeenCalledWith("selection/unfocusObject");
        wrapperRef = wrapper;
      });

      it("should escape multiselection state when arrow key is used without multi-select modifier", async () => {
        const { $store, node1, node2, annotation1, wrapper } =
          mountWithWorkflow();

        // Go right
        await $store.dispatch("selection/selectNode", node1.id);
        await $store.dispatch("selection/selectNode", node2.id);
        await $store.dispatch("selection/selectAnnotation", annotation1.id);

        emitEvent("keydown", "ArrowRight", false);
        await flushPromises();

        expect($store.state.selection.selectedNodes).toStrictEqual({});
        expect($store.state.selection.selectedAnnotations).toStrictEqual({
          [annotation1.id]: true,
        });

        // Go left
        await $store.dispatch("selection/selectNode", node1.id);
        await $store.dispatch("selection/selectNode", node2.id);
        await $store.dispatch("selection/selectAnnotation", annotation1.id);

        emitEvent("keydown", "ArrowLeft", false);
        await flushPromises();

        expect($store.state.selection.selectedNodes).toStrictEqual({
          [node1.id]: true,
        });
        expect($store.state.selection.selectedAnnotations).toStrictEqual({});

        wrapperRef = wrapper;
      });

      it("should add/remove from selection by pressing 'Enter'", async () => {
        const { $store, node1, annotation1, wrapper } = mountWithWorkflow();

        const nodeObject = createWorkflowObject(node1);
        const annotationObject = createWorkflowObject(annotation1);
        mockNearestObject(annotationObject);

        await $store.dispatch("selection/selectNode", node1.id);

        expect($store.state.selection.focusObject).toBeUndefined();

        emitEvent("keydown", "ArrowRight", true);
        await flushPromises();

        expect($store.state.selection.focusedObject).toEqual(nodeObject);

        emitEvent("keydown", "ArrowRight", true);
        await flushPromises();

        expect($store.state.selection.focusedObject).toEqual(annotationObject);

        emitEvent("keydown", "Enter", true);
        await flushPromises();

        expect($store.state.selection.selectedNodes).toStrictEqual({
          [node1.id]: true,
        });
        expect($store.state.selection.selectedAnnotations).toStrictEqual({
          [annotation1.id]: true,
        });

        emitEvent("keydown", "Enter", true);
        await flushPromises();
        expect($store.state.selection.selectedNodes).toStrictEqual({
          [node1.id]: true,
        });
        expect($store.state.selection.selectedAnnotations).toStrictEqual({});

        wrapperRef = wrapper;
      });
    });

    describe("arrow key movement", () => {
      it("should move object with arrow keys", async () => {
        const { $store, node1, node2, wrapper, commitSpy, dispatchSpy } =
          mountWithWorkflow();

        await $store.dispatch("selection/selectNode", node1.id);
        await $store.dispatch("selection/selectNode", node2.id);

        dispatchSpy.mockClear();

        emitEvent("keydown", "Control", true, true);
        emitEvent("keydown", "Shift", true, true);
        emitEvent("keydown", "ArrowRight", true, true);

        await flushPromises();

        expect(commitSpy).toHaveBeenCalledWith("workflow/setTooltip", null);
        expect(commitSpy).toHaveBeenCalledWith("workflow/setIsDragging", true);
        expect(commitSpy).toHaveBeenLastCalledWith("workflow/setMovePreview", {
          deltaX: 5,
          deltaY: 0,
        });
        expect(dispatchSpy).not.toHaveBeenCalled();

        emitEvent("keydown", "Control", true, true);
        emitEvent("keydown", "Shift", true, true);
        emitEvent("keydown", "ArrowUp", true, true);

        await flushPromises();

        expect(commitSpy).toHaveBeenLastCalledWith("workflow/setMovePreview", {
          deltaX: 5,
          deltaY: -5,
        });
        expect(dispatchSpy).not.toHaveBeenCalled();

        emitEvent("keyup", "Control");
        await flushPromises();
        expect(dispatchSpy).toHaveBeenCalledWith("workflow/moveObjects");

        wrapperRef = wrapper;
      });

      it("should not move objects if workflow is not writable", async () => {
        const {
          $store,
          node1,
          wrapper,
          commitSpy,
          dispatchSpy,
          isWorkflowWritableMock,
        } = mountWithWorkflow();

        isWorkflowWritableMock.mockImplementationOnce(() => false);

        await $store.dispatch("selection/selectNode", node1.id);

        dispatchSpy.mockClear();
        commitSpy.mockClear();

        emitEvent("keydown", "Control", true, true);
        emitEvent("keydown", "Shift", true, true);
        emitEvent("keydown", "ArrowRight", true, true);

        await flushPromises();

        expect(commitSpy).not.toHaveBeenCalledWith("worflow/setIsDragging");
        expect(commitSpy).not.toHaveBeenCalledWith("worflow/setMovePreview");
        expect(dispatchSpy).not.toHaveBeenCalled();

        emitEvent("keyup", "Control");
        await flushPromises();
        expect(dispatchSpy).not.toHaveBeenCalled();

        wrapperRef = wrapper;
      });
    });
  });

  describe("initial focus", () => {
    const mocked = mockedObject(workflowNavigationService);

    const mockNearestObject = (value) => {
      mocked.nearestObject.mockResolvedValueOnce(value);
    };

    const mountWithWorkflow = () => {
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
      mountResult.$store.commit("workflow/setActiveWorkflow", workflow);

      return { ...mountResult, workflow, node1, node2, annotation1 };
    };

    it("should select first object on keyboard focus", async () => {
      const { node1, wrapper, dispatchSpy } = mountWithWorkflow();
      const firstNodeObject = createWorkflowObject(node1);

      mockNearestObject(firstNodeObject);

      dispatchSpy.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await wrapper.trigger("focusin");

      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/selectNode",
        firstNodeObject.id,
      );
    });

    it("should not select first object on mouse focus", async () => {
      const { node1, wrapper, dispatchSpy } = mountWithWorkflow();
      const firstNodeObject = createWorkflowObject(node1);

      mockNearestObject(firstNodeObject);

      dispatchSpy.mockClear();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await Vue.nextTick();

      document.dispatchEvent(new Event("mousedown"));
      await Vue.nextTick();

      await wrapper.trigger("focusin");

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "selection/selectNode",
        firstNodeObject.id,
      );
    });

    it("should deselect all objects on escape", async () => {
      const { node1, wrapper, dispatchSpy, $store } = mountWithWorkflow();

      await $store.dispatch("selection/selectNode", node1.id);

      dispatchSpy.mockClear();

      await wrapper.trigger("keydown.esc");

      expect(dispatchSpy).toHaveBeenCalledWith("selection/deselectAllObjects");
    });

    it("should not select anything if something is already selected", async () => {
      const { node1, node2, $store, wrapper, dispatchSpy } =
        mountWithWorkflow();
      const firstNodeObject = createWorkflowObject(node1);

      await $store.dispatch("selection/selectNode", node2.id);
      mockNearestObject(firstNodeObject);

      dispatchSpy.mockClear();

      await wrapper.trigger("focusin");

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });
});
