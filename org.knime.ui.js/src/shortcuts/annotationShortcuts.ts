import { ReorderWorkflowAnnotationsCommand } from "@/api/gateway-api/generated-api";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import {
  defaultAddWorkflowAnnotationWidth,
  defaultAddWorkflowAnnotationHeight,
} from "@/style/shapes.mjs";
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
    text: "Annotation mode",
    icon: AnnotationModeIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "annotation");
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
  },
  addWorkflowAnnotation: {
    text: "New workflow annotation",
    execute: ({ $store, payload }) => {
      const { metadata } = payload;

      if (!metadata?.position) {
        return;
      }

      $store.dispatch("workflow/addWorkflowAnnotation", {
        bounds: {
          x: metadata.position.x,
          y: metadata.position.y,
          width: metadata.width || defaultAddWorkflowAnnotationWidth,
          height: metadata.height || defaultAddWorkflowAnnotationHeight,
        },
      });
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
  },
  bringAnnotationToFront: {
    text: "Bring to front",
    hotkey: ["Ctrl", "Shift", "ArrowUp"],
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
  bringAnnotationForward: {
    hotkey: ["Ctrl", "ArrowUp"],
    text: "Bring forward",
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
  sendAnnotationBackward: {
    hotkey: ["Ctrl", "ArrowDown"],
    text: "Send backward",
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
  sendAnnotationToBack: {
    hotkey: ["Ctrl", "Shift", "ArrowDown"],
    text: "Send to back",
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
};

export default annotationShortcuts;
