import { describe, expect, it } from "vitest";

import { mockStores } from "@/test/utils/mockStores";
import canvasShortcuts from "../canvasShortcuts";

import { mockShortcutContext } from "./mock-context";

describe("canvasShortcuts", () => {
  it("fitToScreen", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.fitToScreen.execute(mockShortcutContext());
    expect(canvasStore.fitToScreen).toHaveBeenCalled();
  });

  it("fillScreen", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.fillScreen.execute(mockShortcutContext());
    expect(canvasStore.fillScreen).toHaveBeenCalled();
  });

  it("zoomIn", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.zoomIn.execute(mockShortcutContext());
    expect(canvasStore.zoomCentered).toHaveBeenCalledWith({ delta: 1 });
  });

  it("zoomOut", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.zoomOut.execute(mockShortcutContext());
    expect(canvasStore.zoomCentered).toHaveBeenCalledWith({ delta: -1 });
  });

  it("zoomTo75", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.zoomTo75.execute(mockShortcutContext());
    expect(canvasStore.zoomCentered).toHaveBeenCalledWith({ factor: 0.75 });
  });

  it("zoomTo100", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.zoomTo100.execute(mockShortcutContext());
    expect(canvasStore.zoomCentered).toHaveBeenCalledWith({ factor: 1 });
  });

  it("zoomTo125", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.zoomTo125.execute(mockShortcutContext());
    expect(canvasStore.zoomCentered).toHaveBeenCalledWith({ factor: 1.25 });
  });

  it("zoomTo150", () => {
    const { canvasStore } = mockStores();

    canvasShortcuts.zoomTo150.execute(mockShortcutContext());
    expect(canvasStore.zoomCentered).toHaveBeenCalledWith({ factor: 1.5 });
  });
});
