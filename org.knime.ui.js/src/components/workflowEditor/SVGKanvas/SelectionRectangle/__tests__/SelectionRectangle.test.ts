import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, shallowMount } from "@vue/test-utils";

import { findObjectsForSelection } from "@/components/workflowEditor/util/findObjectsForSelection";
import { $bus } from "@/plugins/event-bus";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import { createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SelectionRectangle from "../SelectionRectangle.vue";

vi.mock("@/components/workflowEditor/util/findObjectsForSelection", () => ({
  findObjectsForSelection: vi.fn(),
}));

const findObjectsForSelectionMock = vi.mocked(findObjectsForSelection);

describe("SelectionRectangle", () => {
  type MountOpts = {
    props?: any;
    selectedNodeIds?: string[];
    selectedAnnotationIds?: string[];
  };
  const doMount = ({
    props = {},
    selectedNodeIds = [],
    selectedAnnotationIds = [],
  }: MountOpts = {}) => {
    findObjectsForSelectionMock.mockReturnValue({
      nodesInside: ["inside-1", "inside-2"],
      nodesOutside: ["outside-1", "outside-2"],
      annotationsInside: ["ann-inside-1", "ann-inside-2"],
      annotationsOutside: ["ann-outside-1", "ann-outside-2"],
    });

    const workflow = createWorkflow();

    const mockedStores = mockStores();
    // @ts-expect-error
    mockedStores.selectionStore.selectedNodeIds = selectedNodeIds;
    // @ts-expect-error
    mockedStores.selectionStore.selectedAnnotationIds = selectedAnnotationIds;
    // @ts-expect-error
    mockedStores.canvasStore.screenToCanvasCoordinates = vi
      .fn()
      .mockImplementation(([x, y]) => [x, y]);

    mockedStores.workflowStore.setActiveWorkflow(workflow);

    const wrapper = shallowMount(SelectionRectangle, {
      props,
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: {
          $shapes,
          $colors,
          $bus,
        },
      },
      attachTo: document.body,
    });

    const kanvasMock = document.createElement("div");
    kanvasMock.id = "kanvas";
    document.body.appendChild(kanvasMock);

    const pointerDown = async ({
      clientX,
      clientY,
      shiftKey = false,
      pointerId = null,
    }: {
      clientX: number;
      clientY: number;
      shiftKey?: boolean;
      pointerId?: number | null;
    }) => {
      $bus.emit("selection-pointerdown", {
        pointerId: pointerId || 1,
        clientX,
        clientY,
        shiftKey,
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
      await flushPromises();
      await nextTick();
    };

    const pointerMove = async ({
      clientX,
      clientY,
      pointerId = null,
    }: {
      clientX: number;
      clientY: number;
      pointerId?: number | null;
    }) => {
      $bus.emit("selection-pointermove", {
        pointerId: pointerId || 1,
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
      await flushPromises();
      await nextTick();
    };

    const pointerUp = async ({ pointerId = null } = {}) => {
      vi.useFakeTimers(); // implementation contains setTimout

      // stop also changes global dragging state
      $bus.emit("selection-pointerup", {
        pointerId: pointerId || 1,
        target: {
          // @ts-expect-error
          releasePointerCapture: vi.fn(),
        },
      });

      vi.runAllTimers();
      await flushPromises();
      await nextTick();
    };

    return {
      wrapper,
      pointerDown,
      pointerMove,
      pointerUp,
      mockedStores,
      workflow,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const expectedNodeSelectionEvent = (type: "show" | "hide" | "clear") => [
    [
      {
        nodeId: "inside-1",
        type,
      },
    ],
    [
      {
        nodeId: "inside-2",
        type,
      },
    ],
  ];

  const expectedAnnotationSelectionEvent = (type: "show" | "hide" | null) => [
    [
      {
        annotationId: "ann-inside-1",
        type,
      },
    ],
    [
      {
        annotationId: "ann-inside-2",
        type,
      },
    ],
  ];

  it("appears on pointerDown, disappears on pointerUp", async () => {
    const { pointerDown, pointerUp, wrapper } = doMount();
    expect(wrapper.isVisible()).toBe(false);

    await pointerDown({ clientX: 0, clientY: 0 });

    expect(wrapper.isVisible()).toBe(true);

    await pointerUp();
    await nextTick();

    expect(wrapper.isVisible()).toBe(false);
  });

  describe("selection", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount();

      await mountResult.pointerDown({ clientX: 10, clientY: 10 });
      await mountResult.pointerMove({ clientX: 300, clientY: 300 });
      await nextTick();

      return mountResult;
    };

    it("correctly uses algorithm to find included and excluded items", async () => {
      const { workflow } = await mountAndSelect();
      expect(findObjectsForSelectionMock).toHaveBeenCalledWith({
        startPos: { x: 10, y: 10 },
        endPos: { x: 300, y: 300 },
        workflow,
      });
    });

    it("shows selection preview for included nodes", async () => {
      const { wrapper } = await mountAndSelect();

      expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual(
        expectedNodeSelectionEvent("show"),
      );
    });

    it("removes selection preview of previously selected nodes", async () => {
      const { wrapper, pointerMove } = await mountAndSelect();
      // move those nodes out of selection
      findObjectsForSelectionMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: ["inside-1", "inside-2"],
        annotationsInside: [],
        annotationsOutside: [],
      });
      await pointerMove({ clientX: 0, clientY: 0 });

      const selectionPreviewEvents = wrapper.emitted("nodeSelectionPreview");
      // skip first two events that select those nodes
      expect(selectionPreviewEvents!.slice(2)).toStrictEqual(
        expectedNodeSelectionEvent("clear"),
      );
    });

    it("selects nodes on pointer up", async () => {
      const { pointerUp, mockedStores } = await mountAndSelect();
      await pointerUp();

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).toHaveBeenCalledWith(["inside-1", "inside-2"]);
    });

    it("shows selection preview for included annotations", async () => {
      const { wrapper } = await mountAndSelect();
      expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual(
        expectedAnnotationSelectionEvent("show"),
      );
    });

    it("removes selection preview of previously selected annotations", async () => {
      const { wrapper, pointerMove } = await mountAndSelect();
      findObjectsForSelectionMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: [],
        annotationsInside: [],
        annotationsOutside: ["ann-inside-1", "ann-inside-2"],
      });
      await pointerMove({ clientX: 0, clientY: 0 });

      const selectionPreviewEvents = wrapper.emitted(
        "annotationSelectionPreview",
      );

      expect(selectionPreviewEvents!.slice(2)).toStrictEqual(
        expectedAnnotationSelectionEvent(null),
      );
    });

    it("selects annotations on pointer up", async () => {
      const { pointerUp, mockedStores } = await mountAndSelect();
      await pointerUp();

      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledWith(["ann-inside-1", "ann-inside-2"]);
    });
  });

  describe("de-Selection with Shift", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount({
        selectedNodeIds: ["inside-1", "inside-2"],
        selectedAnnotationIds: ["ann-inside-1", "ann-inside-2"],
      });

      await mountResult.pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      await mountResult.pointerMove({ clientX: 10, clientY: 10 });
      await mountResult.pointerMove({ clientX: 0, clientY: 0 });

      vi.clearAllMocks();
      return mountResult;
    };

    describe("nodes", () => {
      it("deselects already selected nodes with preview", async () => {
        const { wrapper } = await mountAndSelect();

        expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual([
          ...expectedNodeSelectionEvent("hide"),
          ...expectedNodeSelectionEvent("hide"),
        ]);
      });

      it("pointerup clears selection preview for nodes", async () => {
        const { wrapper, pointerUp } = await mountAndSelect();
        await pointerUp();

        expect(wrapper.emitted("nodeSelectionPreview")!.slice(2)).toStrictEqual(
          [
            ...expectedNodeSelectionEvent("hide"),
            ...expectedNodeSelectionEvent("clear"),
          ],
        );
      });

      it("pointerup deselects nodes", async () => {
        const { mockedStores, pointerUp, pointerMove } = await mountAndSelect();

        await pointerMove({ clientX: 0, clientY: 0 });
        await pointerUp();

        expect(
          mockedStores.selectionStore.deselectAllObjects,
        ).toHaveBeenCalledWith([]);
      });
    });

    describe("annotations", () => {
      it("deselects already selected annotations with preview", async () => {
        const { wrapper } = await mountAndSelect();
        expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual([
          ...expectedAnnotationSelectionEvent("hide"),
          ...expectedAnnotationSelectionEvent("hide"),
        ]);
      });

      it("pointerup clears selection preview for annotations", async () => {
        const { wrapper, pointerUp } = await mountAndSelect();
        await pointerUp();

        expect(
          wrapper.emitted("annotationSelectionPreview")!.slice(2),
        ).toStrictEqual([
          ...expectedAnnotationSelectionEvent("hide"),
          ...expectedAnnotationSelectionEvent(null),
        ]);
      });

      it("pointerup deselects annotations", async () => {
        const { pointerUp, mockedStores } = await mountAndSelect();
        await pointerUp();

        expect(
          mockedStores.selectionStore.selectAnnotations,
        ).toHaveBeenCalledWith([]);
      });
    });
  });

  describe("selection with shift", () => {
    it("adds nodes to selection with shift", async () => {
      const { mockedStores, pointerDown, pointerMove, pointerUp } = doMount({
        selectedNodeIds: ["root:1"],
      });

      await pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      await pointerMove({ clientX: 36, clientY: 36 });
      await pointerUp();

      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).toHaveBeenCalledWith(["root:1", "inside-1", "inside-2"]);
    });

    it("adds annotations to selection with shift", async () => {
      const { mockedStores, pointerDown, pointerMove, pointerUp } = doMount({
        selectedAnnotationIds: ["root:1"],
      });

      await pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      await pointerMove({ clientX: 36, clientY: 36 });
      await pointerUp();

      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledWith(["ann-inside-1", "ann-inside-2"]);
    });
  });

  describe("non actions", () => {
    it("unregister events on beforeUnmount", () => {
      const $bussOffSpy = vi.spyOn($bus, "off");
      const { wrapper } = doMount();
      // @ts-expect-error
      wrapper.vm.$parent.$off = vi.fn();
      wrapper.unmount();
      expect($bussOffSpy).toHaveBeenCalledTimes(4);
    });

    it("does nothing if move is called but pointerDown is missing", async () => {
      const { wrapper, pointerMove, pointerUp, mockedStores } = doMount();
      await pointerMove({ clientX: 300, clientY: 300 });
      await pointerUp();

      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledTimes(0);
      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledTimes(0);
    });

    it("does nothing if pointerId is different", async () => {
      const { pointerDown, pointerMove, pointerUp, mockedStores } = doMount();

      await pointerDown({ clientX: 300, clientY: 300, pointerId: 22 });
      await pointerMove({ clientX: 300, clientY: 300, pointerId: 3 });
      await pointerUp();

      expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledTimes(0);
      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledTimes(0);
    });
  });
});
