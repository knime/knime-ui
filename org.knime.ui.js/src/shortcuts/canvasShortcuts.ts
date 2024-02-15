/* eslint-disable no-magic-numbers */
import throttle from "raf-throttle";
import AnnotationModeIcon from "@/assets/annotation-mode.svg";
import ArrowMoveIcon from "webapps-common/ui/assets/img/icons/arrow-move.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";

import type { UnionToShortcutRegistry } from "./types";

export type CanvasShortcuts = UnionToShortcutRegistry<
  | "fitToScreen"
  | "fillScreen"
  | "zoomIn"
  | "zoomInAlternative"
  | "zoomOut"
  | "zoomTo75"
  | "zoomTo100"
  | "zoomTo125"
  | "zoomTo150"
  | "switchToAnnotationMode"
  | "switchToPanMode"
  | "switchToSelectionMode"
>;

const zoomInHelper = throttle(({ $store }) => {
  $store.dispatch("canvas/zoomCentered", { delta: 1 });
});

export const canvasShortcuts: CanvasShortcuts = {
  fitToScreen: {
    text: "Fit to screen",
    hotkey: ["Ctrl", "2"],
    execute: ({ $store }) => $store.dispatch("canvas/fitToScreen"),
  },
  fillScreen: {
    text: "Fill entire screen",
    hotkey: ["Ctrl", "1"],
    execute: ({ $store }) => $store.dispatch("canvas/fillScreen"),
  },
  zoomIn: {
    text: "Zoom in",
    hotkey: ["Ctrl", "+"],
    execute: zoomInHelper,
  },
  zoomInAlternative: {
    hotkey: ["Shift", "Ctrl", "="],
    execute: zoomInHelper,
  },
  zoomOut: {
    text: "Zoom out",
    hotkey: ["Ctrl", "-"],
    execute: throttle(({ $store }) => {
      $store.dispatch("canvas/zoomCentered", { delta: -1 });
    }),
  },
  zoomTo75: {
    text: "Zoom to 75%",
    execute: ({ $store }) =>
      $store.dispatch("canvas/zoomCentered", { factor: 0.75 }),
  },
  zoomTo100: {
    text: "Zoom to 100%",
    hotkey: ["Ctrl", "0"],
    execute: ({ $store }) =>
      $store.dispatch("canvas/zoomCentered", { factor: 1 }),
  },
  zoomTo125: {
    text: "Zoom to 125%",
    execute: ({ $store }) =>
      $store.dispatch("canvas/zoomCentered", { factor: 1.25 }),
  },
  zoomTo150: {
    text: "Zoom to 150%",
    execute: ({ $store }) =>
      $store.dispatch("canvas/zoomCentered", { factor: 1.5 }),
  },
  switchToAnnotationMode: {
    hotkey: ["T"],
    text: "Annotation mode",
    icon: AnnotationModeIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "annotation");
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
  },
  switchToPanMode: {
    hotkey: ["P"],
    text: "Pan mode",
    icon: ArrowMoveIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "pan");
    },
    condition: ({ $store }) => !$store.getters["workflow/isWorkflowEmpty"],
  },
  switchToSelectionMode: {
    hotkey: ["V"],
    text: "Selection mode",
    icon: SelectionModeIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "selection");
    },
  },
};
