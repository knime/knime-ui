import { ReorderWorkflowAnnotationsCommand } from "@/api/gateway-api/generated-api";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import {
  defaultAddWorkflowAnnotationHeight,
  defaultAddWorkflowAnnotationWidth,
} from "@/style/shapes";

import type { UnionToShortcutRegistry } from "./types";

type AnnotationShortcuts = UnionToShortcutRegistry<
  | "switchToAnnotationMode"
  | "addWorkflowAnnotation"
  | "bringAnnotationToFront"
  | "bringAnnotationForward"
  | "sendAnnotationBackward"
  | "sendAnnotationToBack"
>;

declare module "./index" {
  interface ShortcutsRegistry extends AnnotationShortcuts {}
}

const annotationShortcuts: AnnotationShortcuts = {
  switchToAnnotationMode: {
    hotkey: ["T"],
    group: "workflowEditorModes",
    text: "Annotation mode",
    icon: AnnotationModeIcon,
    execute: () => {
      useCanvasModesStore().switchCanvasMode("annotation");
    },
    condition: () => useWorkflowStore().isWritable,
  },
  addWorkflowAnnotation: {
    text: "New workflow annotation",
    execute: ({ payload }) => {
      const { metadata } = payload;

      if (!metadata?.position) {
        return;
      }

      useAnnotationInteractionsStore().addWorkflowAnnotation({
        bounds: {
          x: metadata.position.x,
          y: metadata.position.y,
          width: metadata.width || defaultAddWorkflowAnnotationWidth,
          height: metadata.height || defaultAddWorkflowAnnotationHeight,
        },
      });
    },
    condition: () => useWorkflowStore().isWritable,
  },
  bringAnnotationToFront: {
    text: "Bring to front",
    hotkey: ["CtrlOrCmd", "Shift", "PageUp"],
    group: "workflowAnnotations",
    execute: () =>
      useAnnotationInteractionsStore().reorderWorkflowAnnotation({
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront,
      }),
    condition: () =>
      useSelectionStore().getSelectedAnnotations.length > 0 &&
      useWorkflowStore().isWritable,
  },
  bringAnnotationForward: {
    hotkey: ["CtrlOrCmd", "PageUp"],
    text: "Bring forward",
    group: "workflowAnnotations",
    execute: () =>
      useAnnotationInteractionsStore().reorderWorkflowAnnotation({
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward,
      }),
    condition: () =>
      useSelectionStore().getSelectedAnnotations.length > 0 &&
      useWorkflowStore().isWritable,
  },
  sendAnnotationBackward: {
    hotkey: ["CtrlOrCmd", "PageDown"],
    text: "Send backward",
    group: "workflowAnnotations",
    execute: () =>
      useAnnotationInteractionsStore().reorderWorkflowAnnotation({
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward,
      }),
    condition: () =>
      useSelectionStore().getSelectedAnnotations.length > 0 &&
      useWorkflowStore().isWritable,
  },
  sendAnnotationToBack: {
    hotkey: ["CtrlOrCmd", "Shift", "PageDown"],
    text: "Send to back",
    group: "workflowAnnotations",
    execute: () =>
      useAnnotationInteractionsStore().reorderWorkflowAnnotation({
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack,
      }),
    condition: () =>
      useSelectionStore().getSelectedAnnotations.length > 0 &&
      useWorkflowStore().isWritable,
  },
};

export default annotationShortcuts;
