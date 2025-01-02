/* eslint-disable no-magic-numbers */
import throttle from "raf-throttle";

import { useCanvasStore } from "@/store/canvas";

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

const zoomInHelper = throttle(() => {
  useCanvasStore().zoomCentered({ delta: 1 });
});

const canvasShortcuts: CanvasShortcuts = {
  fitToScreen: {
    text: "Fit to screen",
    hotkey: ["CtrlOrCmd", "2"],
    group: "canvasNavigation",
    execute: () => useCanvasStore().fitToScreen(),
  },
  fillScreen: {
    text: "Fill entire screen",
    hotkey: ["CtrlOrCmd", "1"],
    group: "canvasNavigation",
    execute: () => useCanvasStore().fillScreen(),
  },
  zoomIn: {
    text: "Zoom in",
    hotkey: ["CtrlOrCmd", "+"],
    group: "canvasNavigation",
    additionalHotkeys: [{ key: ["Shift", "CtrlOrCmd", "="], visible: false }],
    execute: zoomInHelper,
  },
  zoomOut: {
    text: "Zoom out",
    hotkey: ["CtrlOrCmd", "-"],
    group: "canvasNavigation",
    execute: throttle(() => {
      useCanvasStore().zoomCentered({ delta: -1 });
    }),
  },
  zoomTo75: {
    text: "Zoom to 75%",
    execute: () => useCanvasStore().zoomCentered({ factor: 0.75 }),
  },
  zoomTo100: {
    text: "Zoom to 100%",
    hotkey: ["CtrlOrCmd", "0"],
    group: "canvasNavigation",
    execute: () => useCanvasStore().zoomCentered({ factor: 1 }),
  },
  zoomTo125: {
    text: "Zoom to 125%",
    execute: () => useCanvasStore().zoomCentered({ factor: 1.25 }),
  },
  zoomTo150: {
    text: "Zoom to 150%",
    execute: () => useCanvasStore().zoomCentered({ factor: 1.5 }),
  },
};

export default canvasShortcuts;
