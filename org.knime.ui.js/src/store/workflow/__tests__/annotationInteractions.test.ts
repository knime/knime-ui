import { describe, expect, it } from "vitest";
import { deepMocked } from "@/test/utils";

import { API } from "@api";

import {
  ReorderWorkflowAnnotationsCommand,
  TypedText,
} from "@/api/gateway-api/generated-api";

import * as $colors from "@/style/colors.mjs";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("workflow::annotationInteractions", () => {
  it("should transform annotations", async () => {
    const annotationId = "mock-annotation-id";

    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", {
      projectId: "foo",
      info: { containerId: "root" },
      workflowAnnotations: [
        {
          id: annotationId,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
        },
      ],
    });

    const bounds = { x: 1, y: 2, width: 3, height: 4 };
    store.dispatch("workflow/transformWorkflowAnnotation", {
      bounds,
      annotationId,
    });

    // optimistic update
    expect(
      store.state.workflow.activeWorkflow.workflowAnnotations[0].bounds,
    ).toStrictEqual(bounds);

    expect(
      mockedAPI.workflowCommand.TransformWorkflowAnnotation,
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

    const { store } = await loadStore();

    const mockAnnotation1 = { id: "mock-annotation1" };
    store.commit("workflow/setActiveWorkflow", {
      workflowAnnotations: [mockAnnotation1],
      projectId: "foo",
      info: {
        containerId: "root",
      },
    });
    await store.dispatch("selection/selectAnnotation", mockAnnotation1.id);

    const bounds = { x: 10, y: 10, width: 80, height: 80 };
    await store.dispatch("workflow/addWorkflowAnnotation", { bounds });

    expect(
      mockedAPI.workflowCommand.AddWorkflowAnnotation,
    ).toHaveBeenCalledWith({
      projectId: "foo",
      workflowId: "root",
      bounds,
      borderColor: $colors.defaultAnnotationBorderColor,
    });

    expect(store.state.selection.selectedAnnotations).toEqual({
      "mock-annotation2": true,
    });
    expect(store.state.workflow.editableAnnotationId).toBe("mock-annotation2");
  });

  it.each([
    [ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront],
    [ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward],
    [ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward],
    [ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack],
  ])("reorders annotations (z-index)", async (action) => {
    const { store } = await loadStore();

    const mockAnnotation1 = { id: "mock-annotation1" };
    const mockAnnotation2 = { id: "mock-annotation2" };
    store.commit("workflow/setActiveWorkflow", {
      workflowAnnotations: [mockAnnotation1, mockAnnotation2],
      projectId: "foo",
      info: {
        containerId: "root",
      },
    });
    await store.dispatch("selection/selectAnnotation", mockAnnotation1.id);
    await store.dispatch("selection/selectAnnotation", mockAnnotation2.id);

    store.dispatch("workflow/reorderWorkflowAnnotation", { action });

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
      const { store } = await loadStore();

      const annotationId = "mock-annotation-id";
      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        info: { containerId: "root" },
        workflowAnnotations: [
          {
            id: annotationId,
            text: {
              value: "legacy plain text",
              contentType: TypedText.ContentTypeEnum.Plain,
            },
            borderColor: "#000000",
          },
        ],
      });

      const newText = "<p>new annotation text</p>";

      store.dispatch("workflow/updateAnnotation", {
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
        store.state.workflow.activeWorkflow.workflowAnnotations.find(
          (annotation) => annotation.id === annotationId,
        );
      expect(updatedAnnotation.text.value).toEqual(newText);
      expect(updatedAnnotation.text.contentType).toEqual(
        TypedText.ContentTypeEnum.Html,
      );
    });

    it("should handle failure", async () => {
      const { store } = await loadStore();
      mockedAPI.workflowCommand.UpdateWorkflowAnnotation.mockRejectedValueOnce(
        new Error("random error"),
      );

      const annotationId = "mock-annotation-id";
      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        info: { containerId: "root" },
        workflowAnnotations: [
          {
            id: annotationId,
            text: {
              value: "legacy plain text",
              contentType: TypedText.ContentTypeEnum.Plain,
            },
            borderColor: "#000000",
          },
        ],
      });

      await expect(() =>
        store.dispatch("workflow/updateAnnotation", {
          text: "<p>new annotation text</p>",
          annotationId,
          borderColor: "#123456",
        }),
      ).rejects.toThrowError("random error");

      const updatedAnnotation =
        store.state.workflow.activeWorkflow.workflowAnnotations.find(
          (annotation) => annotation.id === annotationId,
        );

      expect(updatedAnnotation.text.value).toBe("legacy plain text");
      expect(updatedAnnotation.borderColor).toBe("#000000");
      expect(updatedAnnotation.text.contentType).toEqual(
        TypedText.ContentTypeEnum.Plain,
      );
    });
  });
});
