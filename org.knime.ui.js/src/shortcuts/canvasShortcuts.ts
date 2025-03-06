/* eslint-disable no-magic-numbers */
import throttle from "raf-throttle";

import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";

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

const canvasShortcuts: CanvasShortcuts = {
  fitToScreen: {
    text: "Fit to screen",
    hotkey: ["CtrlOrCmd", "2"],
    group: "canvasNavigation",
    execute: () => useCurrentCanvasStore().value.fitToScreen(),
  },
  fillScreen: {
    text: "Fill entire screen",
    hotkey: ["CtrlOrCmd", "1"],
    group: "canvasNavigation",
    execute: () => useCurrentCanvasStore().value.fillScreen(),
  },
  zoomIn: {
    text: "Zoom in",
    hotkey: ["CtrlOrCmd", "+"],
    group: "canvasNavigation",
    additionalHotkeys: [{ key: ["Shift", "CtrlOrCmd", "="], visible: false }],
    execute: throttle(() => {
      useCurrentCanvasStore().value.zoomCentered({ delta: 1 });
    }),
  },
  zoomOut: {
    text: "Zoom out",
    hotkey: ["CtrlOrCmd", "-"],
    group: "canvasNavigation",
    execute: throttle(() => {
      useCurrentCanvasStore().value.zoomCentered({ delta: -1 });
    }),
  },
  zoomTo75: {
    text: "Zoom to 75%",
    execute: () => useCurrentCanvasStore().value.zoomCentered({ factor: 0.75 }),
  },
  zoomTo100: {
    text: "Zoom to 100%",
    hotkey: ["CtrlOrCmd", "0"],
    group: "canvasNavigation",
    execute: () => useCurrentCanvasStore().value.zoomCentered({ factor: 1 }),
  },
  zoomTo125: {
    text: "Zoom to 125%",
    execute: () => useCurrentCanvasStore().value.zoomCentered({ factor: 1.25 }),
  },
  zoomTo150: {
    text: "Zoom to 150%",
    execute: () => useCurrentCanvasStore().value.zoomCentered({ factor: 1.5 }),
  },
};

export default canvasShortcuts;
