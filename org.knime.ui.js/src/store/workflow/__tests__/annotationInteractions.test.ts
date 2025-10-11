import { describe, expect, it } from "vitest";
import { API } from "@api";

import {
  ReorderWorkflowAnnotationsCommand,
  TypedText,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import { createWorkflow, createWorkflowAnnotation } from "@/test/factories";
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
});
