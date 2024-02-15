import { ReorderWorkflowAnnotationsCommand } from "@/api/gateway-api/generated-api";
import { defaultAnnotationSize } from "@/style/shapes.mjs";

import type { UnionToShortcutRegistry } from "../types";
import { conditionGroup } from "../util";

export type AnnotationShortcuts = UnionToShortcutRegistry<
  | "addWorkflowAnnotation"
  | "bringAnnotationToFront"
  | "bringAnnotationForward"
  | "sendAnnotationBackward"
  | "sendAnnotationToBack"
>;

export const annotationShortcuts: AnnotationShortcuts = {
  ...conditionGroup(({ $store }) => $store.getters["workflow/isWritable"], {
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
            width: metadata.width || defaultAnnotationSize,
            height: metadata.height || defaultAnnotationSize,
          },
        });
      },
    },
    bringAnnotationToFront: {
      text: "Bring to front",
      hotkey: ["Ctrl", "Shift", "ArrowUp"],
      execute: ({ $store }) =>
        $store.dispatch("workflow/reorderWorkflowAnnotation", {
          action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront,
        }),
      condition: ({ $store }) =>
        $store.getters["selection/selectedAnnotations"].length > 0,
    },
    bringAnnotationForward: {
      hotkey: ["Ctrl", "ArrowUp"],
      text: "Bring forward",
      execute: ({ $store }) =>
        $store.dispatch("workflow/reorderWorkflowAnnotation", {
          action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward,
        }),
      condition: ({ $store }) =>
        $store.getters["selection/selectedAnnotations"].length > 0,
    },
    sendAnnotationBackward: {
      hotkey: ["Ctrl", "ArrowDown"],
      text: "Send backward",
      execute: ({ $store }) =>
        $store.dispatch("workflow/reorderWorkflowAnnotation", {
          action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward,
        }),
      condition: ({ $store }) =>
        $store.getters["selection/selectedAnnotations"].length > 0,
    },
    sendAnnotationToBack: {
      hotkey: ["Ctrl", "Shift", "ArrowDown"],
      text: "Send to back",
      execute: ({ $store }) =>
        $store.dispatch("workflow/reorderWorkflowAnnotation", {
          action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack,
        }),
      condition: ({ $store }) =>
        $store.getters["selection/selectedAnnotations"].length > 0,
    },
  }),
};
