import { describe, expect, it } from "vitest";
import { API } from "@api";

import {
  ReorderWorkflowAnnotationsCommand,
  TypedText,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import {
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

describe("workflow::annotationInteractions", () => {
  it("should transform annotations", async () => {
    const { workflowStore, annotationInteractionsStore } = mockStores();
    const annotationId = "mock-annotation-id";

    workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId: "foo",
        info: { containerId: "root" },
        workflowAnnotations: [
          createWorkflowAnnotation({
            id: annotationId,
            bounds: { x: 0, y: 0, width: 0, height: 0 },
          }),
        ],
      }),
    );

    const bounds = { x: 1, y: 2, width: 3, height: 4 };

    annotationInteractionsStore.previewWorkflowAnnotationTransform({
      bounds,
      annotationId,
    });

    expect(
      workflowStore.activeWorkflow!.workflowAnnotations[0].bounds,
    ).toStrictEqual(bounds);

    await annotationInteractionsStore.transformWorkflowAnnotation({
      bounds,
      annotationId,
    });

    expect(
      API.workflowCommand.TransformWorkflowAnnotation,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      bounds,
      annotationId,
    });
  });

  it("should add annotation", async () => {
    mockedAPI.workflowCommand.AddWorkflowAnnotation.mockResolvedValueOnce({
      newAnnotationId: "mock-annotation2",
    });

    const { workflowStore, annotationInteractionsStore, selectionStore } =
      mockStores();

    const mockAnnotation1 = createWorkflowAnnotation({
      id: "mock-annotation1",
    });
    workflowStore.setActiveWorkflow(
      createWorkflow({
        workflowAnnotations: [mockAnnotation1],
        projectId: "foo",
        info: {
          containerId: "root",
        },
      }),
    );
    selectionStore.selectAnnotations([mockAnnotation1.id]);

    const bounds = { x: 10, y: 10, width: 80, height: 80 };
    await annotationInteractionsStore.addWorkflowAnnotation({ bounds });

    expect(
      mockedAPI.workflowCommand.AddWorkflowAnnotation,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      bounds,
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    expect(selectionStore.selectedAnnotationIds).toEqual(["mock-annotation2"]);
    expect(annotationInteractionsStore.editableAnnotationId).toBe(
      "mock-annotation2",
    );
  });

  it("should add annotation prefilled with content and set it as editable and selected", async () => {
    const newAnnotationId = "mock-annotation-with-content";

    const { workflowStore, annotationInteractionsStore, selectionStore } =
      mockStores();

    const mockAnnotation1 = createWorkflowAnnotation({
      id: "mock-annotation1",
    });

    const mockNewAnnotation = createWorkflowAnnotation({
      id: newAnnotationId,
      text: {
        value: "",
        contentType: TypedText.ContentTypeEnum.Html,
      },
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    workflowStore.setActiveWorkflow(
      createWorkflow({
        workflowAnnotations: [mockAnnotation1],
        projectId: "foo",
        info: {
          containerId: "root",
        },
      }),
    );
    selectionStore.selectAnnotations([mockAnnotation1.id]);

    const bounds = { x: 10, y: 10, width: 80, height: 80 };
    const content = "Beep boop";

    mockedAPI.workflowCommand.AddWorkflowAnnotation.mockImplementationOnce(
      () => {
        workflowStore.activeWorkflow!.workflowAnnotations.push(
          mockNewAnnotation,
        );
        return { newAnnotationId };
      },
    );

    await annotationInteractionsStore.addWorkflowAnnotationWithContent({
      bounds,
      content,
      setEditable: true,
      setSelected: true,
    });

    expect(
      mockedAPI.workflowCommand.AddWorkflowAnnotation,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      bounds,
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    expect(
      mockedAPI.workflowCommand.UpdateWorkflowAnnotation,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      annotationId: newAnnotationId,
      text: content,
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    expect(selectionStore.selectedAnnotationIds).toEqual([newAnnotationId]);
    expect(annotationInteractionsStore.editableAnnotationId).toBe(
      newAnnotationId,
    );
  });

  it("should add annotation prefilled with content without setting it as editable and selected", async () => {
    const newAnnotationId = "mock-annotation-with-content-not-editable";

    const { workflowStore, annotationInteractionsStore, selectionStore } =
      mockStores();

    const mockAnnotation1 = createWorkflowAnnotation({
      id: "mock-annotation1",
    });

    const mockNewAnnotation = createWorkflowAnnotation({
      id: newAnnotationId,
      text: {
        value: "",
        contentType: TypedText.ContentTypeEnum.Html,
      },
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    workflowStore.setActiveWorkflow(
      createWorkflow({
        workflowAnnotations: [mockAnnotation1],
        projectId: "foo",
        info: {
          containerId: "root",
        },
      }),
    );
    selectionStore.selectAnnotations([mockAnnotation1.id]);

    const bounds = { x: 20, y: 20, width: 100, height: 100 };
    const content = "Blip blop";

    mockedAPI.workflowCommand.AddWorkflowAnnotation.mockImplementationOnce(
      () => {
        workflowStore.activeWorkflow!.workflowAnnotations.push(
          mockNewAnnotation,
        );
        return { newAnnotationId };
      },
    );

    await annotationInteractionsStore.addWorkflowAnnotationWithContent({
      bounds,
      content,
    });

    expect(
      mockedAPI.workflowCommand.AddWorkflowAnnotation,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      bounds,
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    expect(
      mockedAPI.workflowCommand.UpdateWorkflowAnnotation,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      annotationId: newAnnotationId,
      text: content,
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    expect(selectionStore.selectedAnnotationIds).toEqual([]);
    expect(annotationInteractionsStore.editableAnnotationId).toBeNull();
  });

  it.each([
    [ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront],
    [ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward],
    [ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward],
    [ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack],
  ])("reorders annotations (z-index)", async (action) => {
    const { workflowStore, selectionStore, annotationInteractionsStore } =
      mockStores();

    const mockAnnotation1 = createWorkflowAnnotation({
      id: "mock-annotation1",
    });
    const mockAnnotation2 = createWorkflowAnnotation({
      id: "mock-annotation2",
    });
    workflowStore.setActiveWorkflow(
      createWorkflow({
        workflowAnnotations: [mockAnnotation1, mockAnnotation2],
        projectId: "foo",
        info: {
          containerId: "root",
        },
      }),
    );
    selectionStore.selectAnnotations([mockAnnotation1.id]);
    selectionStore.selectAnnotations([mockAnnotation2.id]);

    await annotationInteractionsStore.reorderWorkflowAnnotation({ action });

    expect(
      mockedAPI.workflowCommand.ReorderWorkflowAnnotations,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      action,
      annotationIds: [mockAnnotation1.id, mockAnnotation2.id],
    });
  });

  describe("update annotation", () => {
    it("should handle success", async () => {
      const { workflowStore, annotationInteractionsStore } = mockStores();

      const annotationId = "mock-annotation-id";
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
          workflowAnnotations: [
            createWorkflowAnnotation({
              id: annotationId,
              text: {
                value: "legacy plain text",
                contentType: TypedText.ContentTypeEnum.Plain,
              },
              borderColor: "#000000",
            }),
          ],
        }),
      );

      const newText = "<p>new annotation text</p>";

      await annotationInteractionsStore.updateAnnotation({
        text: newText,
        annotationId,
        borderColor: "#123456",
      });

      expect(
        mockedAPI.workflowCommand.UpdateWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        projectId: "foo",
        workflowId: "root",
        text: newText,
        annotationId,
        borderColor: "#123456",
      });

      const updatedAnnotation =
        workflowStore.activeWorkflow!.workflowAnnotations.find(
          (annotation) => annotation.id === annotationId,
        )!;
      expect(updatedAnnotation.text.value).toEqual(newText);
      expect(updatedAnnotation.text.contentType).toEqual(
        TypedText.ContentTypeEnum.Html,
      );
    });

    it("should handle failure", async () => {
      const { workflowStore, annotationInteractionsStore } = mockStores();
      mockedAPI.workflowCommand.UpdateWorkflowAnnotation.mockRejectedValueOnce(
        new Error("random error"),
      );

      const annotationId = "mock-annotation-id";
      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
          workflowAnnotations: [
            createWorkflowAnnotation({
              id: annotationId,
              text: {
                value: "legacy plain text",
                contentType: TypedText.ContentTypeEnum.Plain,
              },
              borderColor: "#000000",
            }),
          ],
        }),
      );

      await expect(() =>
        annotationInteractionsStore.updateAnnotation({
          text: "<p>new annotation text</p>",
          annotationId,
          borderColor: "#123456",
        }),
      ).rejects.toThrowError("random error");

      const updatedAnnotation =
        workflowStore.activeWorkflow!.workflowAnnotations.find(
          (annotation) => annotation.id === annotationId,
        )!;

      expect(updatedAnnotation.text.value).toBe("legacy plain text");
      expect(updatedAnnotation.borderColor).toBe("#000000");
      expect(updatedAnnotation.text.contentType).toEqual(
        TypedText.ContentTypeEnum.Plain,
      );
    });
  });

  describe("getters", () => {
    describe("getAnnotationBoundsForSelectedNodes", () => {
      it("returns default bounds when no nodes are selected", () => {
        const { annotationInteractionsStore } = mockStores();

        const bounds =
          annotationInteractionsStore.getAnnotationBoundsForSelectedNodes;

        expect(bounds).toEqual({
          x: 0,
          y: 0,
          width: 80,
          height: 80,
        });
      });

      it("calculates bounds for multiple selected nodes", () => {
        const { workflowStore, selectionStore, annotationInteractionsStore } =
          mockStores();

        const node1 = createNativeNode({
          id: "node-1",
          position: { x: 100, y: 200 },
        });
        const node2 = createNativeNode({
          id: "node-2",
          position: { x: 300, y: 400 },
        });
        const node3 = createNativeNode({
          id: "node-3",
          position: { x: 200, y: 300 },
        });

        workflowStore.setActiveWorkflow(
          createWorkflow({
            nodes: {
              [node1.id]: node1,
              [node2.id]: node2,
              [node3.id]: node3,
            },
          }),
        );

        selectionStore.selectNodes([node1.id, node2.id, node3.id]);

        const bounds =
          annotationInteractionsStore.getAnnotationBoundsForSelectedNodes;

        // With nodeSize = 32:
        const nodeSize = $shapes.nodeSize;
        const xOffset = 2 * nodeSize;
        const yOffset = 6 * nodeSize;
        const widthPadding = 3 * nodeSize;
        const heightPadding = 4 * nodeSize;

        expect(bounds.x).toBe(100 - xOffset);
        expect(bounds.y).toBe(200 - yOffset);
        expect(bounds.width).toBe(300 - (100 - xOffset) + widthPadding);
        expect(bounds.height).toBe(400 - (200 - yOffset) + heightPadding);
      });
    });

    describe("getContainedNodesForAnnotation", () => {
      it("returns empty array when no active workflow", () => {
        const { annotationInteractionsStore } = mockStores();

        const nodeIds =
          annotationInteractionsStore.getContainedNodesForAnnotation(
            "non-existent",
          );

        expect(nodeIds).toEqual([]);
      });

      it("returns empty array when annotation does not exist", () => {
        const { workflowStore, annotationInteractionsStore } = mockStores();

        workflowStore.setActiveWorkflow(
          createWorkflow({
            workflowAnnotations: [],
          }),
        );

        const nodeIds =
          annotationInteractionsStore.getContainedNodesForAnnotation(
            "non-existent",
          );

        expect(nodeIds).toEqual([]);
      });

      it("returns nodes inside annotation bounds", () => {
        const { workflowStore, annotationInteractionsStore } = mockStores();

        const node1 = createNativeNode({
          id: "node-1",
          position: { x: 50, y: 50 },
        });
        const node2 = createNativeNode({
          id: "node-2",
          position: { x: 150, y: 150 },
        });
        const node3 = createNativeNode({
          id: "node-3",
          position: { x: 250, y: 250 },
        });

        const annotation = createWorkflowAnnotation({
          id: "annotation-1",
          bounds: { x: 0, y: 0, width: 200, height: 200 },
        });

        workflowStore.setActiveWorkflow(
          createWorkflow({
            nodes: {
              [node1.id]: node1,
              [node2.id]: node2,
              [node3.id]: node3,
            },
            workflowAnnotations: [annotation],
          }),
        );

        const nodeIds =
          annotationInteractionsStore.getContainedNodesForAnnotation(
            annotation.id,
          );

        // node1 and node2 are inside, node3 is outside
        expect(nodeIds).toEqual(["node-1", "node-2"]);
      });

      it("returns empty array when no nodes are inside annotation", () => {
        const { workflowStore, annotationInteractionsStore } = mockStores();

        const node1 = createNativeNode({
          id: "node-1",
          position: { x: 250, y: 250 },
        });

        const annotation = createWorkflowAnnotation({
          id: "annotation-1",
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        });

        workflowStore.setActiveWorkflow(
          createWorkflow({
            nodes: { [node1.id]: node1 },
            workflowAnnotations: [annotation],
          }),
        );

        const nodeIds =
          annotationInteractionsStore.getContainedNodesForAnnotation(
            annotation.id,
          );

        expect(nodeIds).toEqual([]);
      });

      it("includes nodes at annotation boundaries", () => {
        const { workflowStore, annotationInteractionsStore } = mockStores();

        const nodeAtTopLeft = createNativeNode({
          id: "node-top-left",
          position: { x: 0, y: 0 },
        });
        const nodeAtBottomRight = createNativeNode({
          id: "node-bottom-right",
          position: { x: 200, y: 200 },
        });

        const annotation = createWorkflowAnnotation({
          id: "annotation-1",
          bounds: { x: 0, y: 0, width: 200, height: 200 },
        });

        workflowStore.setActiveWorkflow(
          createWorkflow({
            nodes: {
              [nodeAtTopLeft.id]: nodeAtTopLeft,
              [nodeAtBottomRight.id]: nodeAtBottomRight,
            },
            workflowAnnotations: [annotation],
          }),
        );

        const nodeIds =
          annotationInteractionsStore.getContainedNodesForAnnotation(
            annotation.id,
          );

        expect(nodeIds).toEqual(["node-top-left", "node-bottom-right"]);
      });
    });
  });
});
