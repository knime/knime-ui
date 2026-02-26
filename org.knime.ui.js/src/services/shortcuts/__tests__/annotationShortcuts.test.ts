import { describe, expect, it, vi } from "vitest";

import { ReorderWorkflowAnnotationsCommand } from "@/api/gateway-api/generated-api";
import * as shapes from "@/style/shapes";
import {
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import annotationShortcuts from "../annotationShortcuts";

import { mockShortcutContext } from "./mock-context";

describe("annotationShortcuts", () => {
  const createStore = () => {
    const {
      workflowStore,
      selectionStore,
      annotationInteractionsStore,
      canvasModesStore,
      aiQuickActionsStore,
    } = mockStores();

    const annotation1 = createWorkflowAnnotation({
      id: "annotation:1",
      bounds: { x: 40, y: 10, width: 20, height: 20 },
    });

    const node1 = createNativeNode({ id: "root:1" });

    workflowStore.activeWorkflow = createWorkflow({
      allowedActions: {},
      workflowAnnotations: [annotation1],
      nodes: { "root:1": node1 },
    });

    return {
      workflowStore,
      selectionStore,
      annotationInteractionsStore,
      canvasModesStore,
      aiQuickActionsStore,
    };
  };

  describe("execute", () => {
    it("should dispatch action to add annotation", () => {
      const { annotationInteractionsStore } = createStore();

      const position = { x: 10, y: 10 };
      annotationShortcuts.addWorkflowAnnotation.execute(
        mockShortcutContext({ payload: { metadata: { position } } }),
      );
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

      annotationShortcuts[shortcutName].execute(mockShortcutContext());
      expect(
        annotationInteractionsStore.reorderWorkflowAnnotation,
      ).toHaveBeenCalledWith({ action });
    });
  });

  it("should dispatch action to switch to annotation mode", () => {
    const { canvasModesStore } = createStore();

    annotationShortcuts.switchToAnnotationMode.execute(mockShortcutContext());
    expect(canvasModesStore.switchCanvasMode).toHaveBeenCalledWith(
      "annotation",
    );
  });

  it("should dispatch action to generate workflow annotation via K-AI when at least one node is selected", () => {
    const { aiQuickActionsStore, selectionStore } = createStore();

    selectionStore.selectNodes(["root:1"]);

    annotationShortcuts.generateWorkflowAnnotation.execute(
      mockShortcutContext(),
    );
    expect(aiQuickActionsStore.generateAnnotation).toHaveBeenCalled();
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

        expect(annotationShortcuts[shortcutName].condition?.()).toBe(false);
        selectionStore.selectAnnotations(["annotation:1"]);
        expect(annotationShortcuts[shortcutName].condition?.()).toBe(true);
        // @ts-expect-error
        workflowStore.isWritable = false;
        expect(annotationShortcuts[shortcutName].condition?.()).toBe(false);
      },
    );

    it("cannot add annotation when workflow is not writable", () => {
      const { workflowStore } = createStore();

      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(annotationShortcuts.addWorkflowAnnotation.condition?.()).toBe(
        false,
      );
    });

    it("can generate annotation when nodes are selected and workflow is writable", () => {
      const { selectionStore } = createStore();

      expect(annotationShortcuts.generateWorkflowAnnotation.condition?.()).toBe(
        false,
      );

      selectionStore.selectNodes(["root:1"]);
      expect(annotationShortcuts.generateWorkflowAnnotation.condition?.()).toBe(
        true,
      );
    });

    it("cannot generate annotation when workflow is not writable", () => {
      const { workflowStore, selectionStore } = createStore();

      selectionStore.selectNodes(["root:1"]);
      expect(annotationShortcuts.generateWorkflowAnnotation.condition?.()).toBe(
        true,
      );

      // @ts-expect-error
      workflowStore.isWritable = false;
      expect(annotationShortcuts.generateWorkflowAnnotation.condition?.()).toBe(
        false,
      );
    });

    it("cannot generate annotation when AI quick actions are not available", () => {
      const { selectionStore, aiQuickActionsStore } = createStore();

      selectionStore.selectNodes(["root:1"]);
      aiQuickActionsStore.isQuickActionAvailable = vi
        .fn()
        .mockReturnValueOnce(false);

      expect(annotationShortcuts.generateWorkflowAnnotation.condition?.()).toBe(
        false,
      );
    });
  });
});
