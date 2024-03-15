/* eslint-disable no-magic-numbers */
import throttle from "raf-throttle";

import type { UnionToShortcutRegistry } from "./types";

type CanvasShortcuts = UnionToShortcutRegistry<
  | "fitToScreen"
  | "fillScreen"
  | "zoomIn"
  | "zoomOut"
  | "zoomTo75"
  | "zoomTo100"
  | "zoomTo125"
  | "zoomTo150"
>;

declare module "./index" {
  interface ShortcutsRegistry extends CanvasShortcuts {}
}

const zoomInHelper = throttle(({ $store }) => {
  $store.dispatch("canvas/zoomCentered", { delta: 1 });
});

const canvasShortcuts: CanvasShortcuts = {
  fitToScreen: {
    text: "Fit to screen",
    hotkey: ["Ctrl", "2"],
    group: "canvasNavigation",
    execute: ({ $store }) => $store.dispatch("canvas/fitToScreen"),
  },
  fillScreen: {
    text: "Fill entire screen",
    hotkey: ["Ctrl", "1"],
    group: "canvasNavigation",
    execute: ({ $store }) => $store.dispatch("canvas/fillScreen"),
  },
  zoomIn: {
    text: "Zoom in",
    hotkey: ["Ctrl", "+"],
    group: "canvasNavigation",
    additionalHotkeys: [{ key: ["Shift", "Ctrl", "="], visible: false }],
    execute: zoomInHelper,
  },
  zoomOut: {
    text: "Zoom out",
    hotkey: ["Ctrl", "-"],
    group: "canvasNavigation",
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
    group: "canvasNavigation",
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
};

export default canvasShortcuts;
