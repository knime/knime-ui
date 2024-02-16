import { expect, describe, it, vi } from "vitest";
import annotationShortcuts from "../annotationShortcuts";
import { ReorderWorkflowAnnotationsCommand } from "@/api/gateway-api/generated-api";
import * as shapes from "@/style/shapes.mjs";

describe("annotationShortcuts", () => {
  const mockSelectedNode = { id: "root:0", allowedActions: {} };

  const createStore = ({
    containerType = "project",
    selectedNodes = [],
    selectedConnections = [],
    selectedAnnotations = [],
    singleSelectedNode = mockSelectedNode,
    isWorkflowWritable = true,
    getScrollContainerElement = vi.fn(),
    getNodeById = vi.fn(),
    getVisibleFrame = vi
      .fn()
      .mockReturnValue({ left: -500, top: -500, width: 1000, height: 1000 }),
  } = {}) => {
    const mockDispatch = vi.fn();
    const $store = {
      dispatch: mockDispatch,
      state: {
        application: {
          activeProjectId: "activeTestProjectId",
          hasClipboardSupport: true,
        },
        workflow: {
          activeWorkflow: {
            allowedActions: {},
            info: {
              containerType,
            },
            nodes: {
              node1: {
                position: {
                  x: 300,
                  y: 200,
                },
              },
            },
            parents: [
              {
                containerId: "root:parent",
              },
              {
                containerId: "direct:parent:id",
              },
            ],
          },
          quickAddNodeMenu: {
            isOpen: false,
            props: {},
            events: {},
          },
        },
        canvas: {
          getScrollContainerElement,
        },
      },
      getters: {
        "selection/selectedNodes": selectedNodes,
        "selection/selectedConnections": selectedConnections,
        "selection/singleSelectedNode": singleSelectedNode,
        "selection/selectedAnnotations": selectedAnnotations,
        "workflow/isWritable": isWorkflowWritable,
        "workflow/getNodeById": getNodeById,
        "canvas/getVisibleFrame": getVisibleFrame,
        "application/activeProjectOrigin": {
          providerId: "some-provider",
          spaceId: "some-space",
        },
      },
    };

    return { mockDispatch, $store };
  };

  describe("execute", () => {
    it("should dispatch action to add annotation", () => {
      const { $store, mockDispatch } = createStore();

      const position = { x: 10, y: 10 };
      annotationShortcuts.addWorkflowAnnotation.execute({
        $store,
        payload: { metadata: { position } },
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/addWorkflowAnnotation",
        {
          bounds: {
            x: 10,
            y: 10,
            width: shapes.defaultAddWorkflowAnnotationWidth,
            height: shapes.defaultAddWorkflowAnnotationHeight,
          },
        },
      );
    });

    it.each([
      ["bringAnnotationToFront"],
      ["bringAnnotationForward"],
      ["sendAnnotationBackward"],
      ["sendAnnotationToBack"],
    ])("should dispatch %s to reorder annotation", (shortcutName) => {
      const { $store, mockDispatch } = createStore();

      const actions = {
        bringAnnotationToFront:
          ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront,
        bringAnnotationForward:
          ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward,
        sendAnnotationBackward:
          ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward,
        sendAnnotationToBack:
          ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack,
      };
      const action = actions[shortcutName];

      annotationShortcuts[shortcutName].execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith(
        "workflow/reorderWorkflowAnnotation",
        { action },
      );
    });
  });

  it("should dispatch action to switch to annotation mode", () => {
    const { $store, mockDispatch } = createStore();

    annotationShortcuts.switchToAnnotationMode.execute({
      $store,
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      "application/switchCanvasMode",
      "annotation",
    );
  });

  describe("condition", () => {
    it.each([
      ["bringAnnotationToFront"],
      ["bringAnnotationForward"],
      ["sendAnnotationBackward"],
      ["sendAnnotationToBack"],
    ])(
      "should check selected annotations when trying to %s",
      (shortcutName) => {
        const { $store } = createStore();

        expect(annotationShortcuts[shortcutName].condition({ $store })).toBe(
          false,
        );

        $store.getters["selection/selectedAnnotations"] = [
          { id: "mock-annotation" },
        ];
        expect(annotationShortcuts[shortcutName].condition({ $store })).toBe(
          true,
        );

        $store.getters["workflow/isWritable"] = false;
        expect(annotationShortcuts[shortcutName].condition({ $store })).toBe(
          false,
        );
      },
    );

    it("cannot add annotation when workflow is not writable", () => {
      const { $store } = createStore();
      $store.getters["workflow/isWritable"] = false;

      expect(
        annotationShortcuts.addWorkflowAnnotation.condition({ $store }),
      ).toBe(false);
    });
  });
});
