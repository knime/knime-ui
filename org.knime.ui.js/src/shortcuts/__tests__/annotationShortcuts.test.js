import { describe, expect, it } from "vitest";

import { ReorderWorkflowAnnotationsCommand } from "@/api/gateway-api/generated-api";
import * as shapes from "@/style/shapes";
import { createWorkflowAnnotation } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import annotationShortcuts from "../annotationShortcuts";

describe("annotationShortcuts", () => {
  const createStore = () => {
    const {
      workflowStore,
      selectionStore,
      annotationInteractionsStore,
      canvasModesStore,
    } = mockStores();

    const annotation1 = createWorkflowAnnotation({
      id: "annotation:1",
      bounds: { x: 40, y: 10, width: 20, height: 20 },
    });

    workflowStore.activeWorkflow = {
      allowedActions: {},
      info: {
        containerType: "project",
      },
      workflowAnnotations: [annotation1],
    };

    return {
      workflowStore,
      selectionStore,
      annotationInteractionsStore,
      canvasModesStore,
    };
  };

  describe("execute", () => {
    it("should dispatch action to add annotation", () => {
      const { annotationInteractionsStore } = createStore();

      const position = { x: 10, y: 10 };
      annotationShortcuts.addWorkflowAnnotation.execute({
        payload: { metadata: { position } },
      });
      expect(
        annotationInteractionsStore.addWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        bounds: {
          x: 10,
          y: 10,
          width: shapes.defaultAddWorkflowAnnotationWidth,
          height: shapes.defaultAddWorkflowAnnotationHeight,
        },
      });
    });

    it.each([
      ["bringAnnotationToFront"],
      ["bringAnnotationForward"],
      ["sendAnnotationBackward"],
      ["sendAnnotationToBack"],
    ])("should dispatch %s to reorder annotation", (shortcutName) => {
      const { annotationInteractionsStore } = createStore();

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

      annotationShortcuts[shortcutName].execute();
      expect(
        annotationInteractionsStore.reorderWorkflowAnnotation,
      ).toHaveBeenCalledWith({ action });
    });
  });

  it("should dispatch action to switch to annotation mode", () => {
    const { canvasModesStore } = createStore();

    annotationShortcuts.switchToAnnotationMode.execute();
    expect(canvasModesStore.switchCanvasMode).toHaveBeenCalledWith(
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
        const { selectionStore, workflowStore } = createStore();

        expect(annotationShortcuts[shortcutName].condition()).toBe(false);
        selectionStore.selectAnnotations(["annotation:1"]);
        expect(annotationShortcuts[shortcutName].condition()).toBe(true);
        // @ts-expect-error: Getter is read only
        workflowStore.isWritable = false;
        expect(annotationShortcuts[shortcutName].condition()).toBe(false);
      },
    );

    it("cannot add annotation when workflow is not writable", () => {
      const { workflowStore } = createStore();

      // @ts-expect-error: Getter is read only
      workflowStore.isWritable = false;
      expect(annotationShortcuts.addWorkflowAnnotation.condition()).toBe(false);
    });
  });
});
