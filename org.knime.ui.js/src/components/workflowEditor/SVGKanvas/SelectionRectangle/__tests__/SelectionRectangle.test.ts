import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

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
    selectedBendpointIds?: string[];
  };
  const doMount = ({
    props = {},
    selectedNodeIds = [],
    selectedAnnotationIds = [],
    selectedBendpointIds = [],
  }: MountOpts = {}) => {
    findObjectsForSelectionMock.mockReturnValue({
      nodesInside: ["inside-1", "inside-2"],
      nodesOutside: ["outside-1", "outside-2"],
      annotationsInside: ["ann-inside-1", "ann-inside-2"],
      annotationsOutside: ["ann-outside-1", "ann-outside-2"],
      bendpointsInside: ["connection1__0"],
      bendpointsOutside: [],
    });

    const workflow = createWorkflow();

    const mockedStores = mockStores();
    // @ts-expect-error
    mockedStores.selectionStore.selectedNodeIds = selectedNodeIds;
    // @ts-expect-error
    mockedStores.selectionStore.selectedAnnotationIds = selectedAnnotationIds;
    // @ts-expect-error
    mockedStores.selectionStore.selectedBendpointIds = selectedBendpointIds;
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

    const pointerDown = ({
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
    };

    const pointerMove = ({
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
    };

    const pointerUp = ({ pointerId = null } = {}) => {
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

  it("all object are deselected on start", async () => {
    const { pointerDown, mockedStores } = doMount();

    pointerDown({ clientX: 0, clientY: 0 });
    await nextTick();

    expect(mockedStores.selectionStore.deselectAllObjects).toBeCalled();
  });

  it("appears on pointerDown, disappears on pointerUp", async () => {
    const { pointerDown, pointerUp, wrapper } = doMount();
    expect(wrapper.isVisible()).toBe(false);

    pointerDown({ clientX: 0, clientY: 0 });
    await nextTick();

    expect(wrapper.isVisible()).toBe(true);

    pointerUp();
    await nextTick();

    expect(wrapper.isVisible()).toBe(false);
  });

  describe("selection", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount();

      mountResult.pointerDown({ clientX: 10, clientY: 10 });
      mountResult.pointerMove({ clientX: 300, clientY: 300 });
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
      expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "show",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "show",
          },
        ],
      ]);
    });

    it("removes selection preview of previously selected nodes", async () => {
      const { wrapper, pointerMove } = await mountAndSelect();
      // move those nodes out of selection
      findObjectsForSelectionMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: ["inside-1", "inside-2"],
        annotationsInside: [],
        annotationsOutside: [],
        bendpointsInside: [],
        bendpointsOutside: [],
      });
      pointerMove({ clientX: 0, clientY: 0 });
      await nextTick();

      const selectionPreviewEvents = wrapper.emitted("nodeSelectionPreview");
      // skip first two events that select those nodes
      expect(selectionPreviewEvents!.slice(2)).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "clear",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "clear",
          },
        ],
      ]);
    });

    it("selects nodes on pointer up", async () => {
      const { pointerUp, mockedStores } = await mountAndSelect();
      pointerUp();

      expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledWith([
        "inside-1",
        "inside-2",
      ]);
    });

    it("shows selection preview for included annotations", async () => {
      const { wrapper } = await mountAndSelect();
      expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: "show",
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: "show",
          },
        ],
      ]);
    });

    it("removes selection preview of previously selected annotations", async () => {
      const { wrapper, pointerMove } = await mountAndSelect();
      findObjectsForSelectionMock.mockReturnValue({
        nodesInside: [],
        nodesOutside: [],
        annotationsInside: [],
        annotationsOutside: ["ann-inside-1", "ann-inside-2"],
        bendpointsInside: [],
        bendpointsOutside: [],
      });
      pointerMove({ clientX: 0, clientY: 0 });
      await nextTick();

      const selectionPreviewEvents = wrapper.emitted(
        "annotationSelectionPreview",
      );

      expect(selectionPreviewEvents!.slice(2)).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: null,
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: null,
          },
        ],
      ]);
    });

    it("selects annotations on pointer up", async () => {
      const { pointerUp, mockedStores } = await mountAndSelect();
      pointerUp();

      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledWith(["ann-inside-1", "ann-inside-2"]);
    });

    it("sets didStartRectangleSelection to true when rectangle selection updates", async () => {
      const { pointerDown, pointerMove, mockedStores } = await mountAndSelect();
      pointerDown({ clientX: 10, clientY: 10 });
      pointerMove({ clientX: 300, clientY: 300 });
      await nextTick();

      expect(
        mockedStores.selectionStore.setDidStartRectangleSelection,
      ).toHaveBeenCalledWith(true);
    });

    it("sets didStartRectangleSelection to false when rectangle selection ends", async () => {
      const { pointerDown, pointerMove, pointerUp, mockedStores } =
        await mountAndSelect();
      pointerDown({ clientX: 10, clientY: 10 });
      pointerMove({ clientX: 300, clientY: 300 });
      await nextTick();
      pointerUp();

      expect(
        mockedStores.selectionStore.setDidStartRectangleSelection,
      ).toHaveBeenCalledWith(false);
    });
  });

  describe("de-Selection with Shift", () => {
    const mountAndSelect = async () => {
      const mountResult = doMount({
        selectedNodeIds: ["inside-1", "inside-2"],
        selectedAnnotationIds: ["ann-inside-1", "ann-inside-2"],
        selectedBendpointIds: ["connection1__0"],
      });

      mountResult.pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      mountResult.pointerMove({ clientX: 0, clientY: 0 });

      await nextTick();

      return mountResult;
    };

    it("no global deselection", async () => {
      const { mockedStores } = await mountAndSelect();
      expect(
        mockedStores.selectionStore.deselectAllObjects,
      ).not.toHaveBeenCalled();
    });

    describe("nodes", () => {
      it("deselects already selected nodes with preview", async () => {
        const { wrapper } = await mountAndSelect();

        expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual([
          [
            {
              nodeId: "inside-1",
              type: "hide",
            },
          ],
          [
            {
              nodeId: "inside-2",
              type: "hide",
            },
          ],
        ]);
      });

      it("pointerup clears selection preview for nodes", async () => {
        const { wrapper, pointerUp } = await mountAndSelect();
        pointerUp();

        expect(wrapper.emitted("nodeSelectionPreview")!.slice(2)).toStrictEqual(
          [
            [
              {
                nodeId: "inside-1",
                type: "clear",
              },
            ],
            [
              {
                nodeId: "inside-2",
                type: "clear",
              },
            ],
          ],
        );
      });

      it("pointerup deselects nodes", async () => {
        const { pointerUp, mockedStores } = await mountAndSelect();
        pointerUp();

        expect(mockedStores.selectionStore.selectNodes).not.toHaveBeenCalled();
        expect(mockedStores.selectionStore.deselectNodes).toHaveBeenCalledWith([
          "inside-1",
          "inside-2",
        ]);
      });
    });

    describe("annotations", () => {
      it("deselects already selected annotations with preview", async () => {
        const { wrapper } = await mountAndSelect();
        expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual([
          [
            {
              annotationId: "ann-inside-1",
              type: "hide",
            },
          ],
          [
            {
              annotationId: "ann-inside-2",
              type: "hide",
            },
          ],
        ]);
      });

      it("pointerup clears selection preview for annotations", async () => {
        const { wrapper, pointerUp } = await mountAndSelect();
        pointerUp();

        expect(
          wrapper.emitted("annotationSelectionPreview")!.slice(2),
        ).toStrictEqual([
          [
            {
              annotationId: "ann-inside-1",
              type: null,
            },
          ],
          [
            {
              annotationId: "ann-inside-2",
              type: null,
            },
          ],
        ]);
      });

      it("pointerup deselects annotations", async () => {
        const { pointerUp, mockedStores } = await mountAndSelect();
        pointerUp();

        expect(
          mockedStores.selectionStore.selectAnnotations,
        ).not.toHaveBeenCalled();
        expect(
          mockedStores.selectionStore.deselectAnnotations,
        ).toHaveBeenCalledWith(["ann-inside-1", "ann-inside-2"]);
      });
    });
  });

  describe("selection with shift", () => {
    it("adds nodes to selection with shift", async () => {
      const { mockedStores, pointerDown, pointerMove, pointerUp, wrapper } =
        doMount({
          selectedNodeIds: ["root:1"],
        });

      pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      pointerMove({ clientX: 36, clientY: 36 });
      await nextTick();

      expect(wrapper.emitted("nodeSelectionPreview")).toStrictEqual([
        [
          {
            nodeId: "inside-1",
            type: "show",
          },
        ],
        [
          {
            nodeId: "inside-2",
            type: "show",
          },
        ],
      ]);

      pointerUp();
      expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledWith([
        "inside-1",
        "inside-2",
      ]);
    });

    it("adds annotations to selection with shift", async () => {
      const { mockedStores, pointerDown, pointerMove, pointerUp, wrapper } =
        doMount({
          selectedAnnotationIds: ["root:1"],
        });

      pointerDown({ clientX: 0, clientY: 0, shiftKey: true });
      pointerMove({ clientX: 36, clientY: 36 });
      await nextTick();

      expect(wrapper.emitted("annotationSelectionPreview")).toStrictEqual([
        [
          {
            annotationId: "ann-inside-1",
            type: "show",
          },
        ],
        [
          {
            annotationId: "ann-inside-2",
            type: "show",
          },
        ],
      ]);

      pointerUp();
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

    it("does nothing if move is called but selection is not active", async () => {
      const { wrapper, pointerMove, pointerUp, mockedStores } = doMount();
      // pointerDown is missing
      pointerMove({ clientX: 300, clientY: 300 });
      await nextTick();
      pointerUp();
      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledTimes(0);
      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledTimes(0);
    });

    it("does nothing if pointerId is different", async () => {
      const { wrapper, pointerDown, pointerMove, pointerUp, mockedStores } =
        doMount();

      pointerDown({ clientX: 300, clientY: 300, pointerId: 22 });
      pointerMove({ clientX: 300, clientY: 300, pointerId: 3 });
      await nextTick();
      pointerUp();
      expect(wrapper.emitted("nodeSelectionPreview")).toBeFalsy();
      expect(wrapper.emitted("annotationSelectionPreview")).toBeFalsy();
      expect(mockedStores.selectionStore.selectNodes).toHaveBeenCalledTimes(0);
      expect(
        mockedStores.selectionStore.selectAnnotations,
      ).toHaveBeenCalledTimes(0);
    });
  });
});
