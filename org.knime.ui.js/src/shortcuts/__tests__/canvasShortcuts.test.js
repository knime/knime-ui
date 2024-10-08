import { beforeEach, describe, expect, it, vi } from "vitest";

import canvasShortcuts from "../canvasShortcuts";

describe("canvasShortcuts", () => {
  let mockDispatch, $store;

  beforeEach(() => {
    mockDispatch = vi.fn();
    $store = {
      dispatch: mockDispatch,
    };
  });

  it("fitToScreen", () => {
    canvasShortcuts.fitToScreen.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/fitToScreen");
  });

  it("fillScreen", () => {
    canvasShortcuts.fillScreen.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/fillScreen");
  });

  it("zoomIn", () => {
    canvasShortcuts.zoomIn.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/zoomCentered", {
      delta: 1,
    });
  });

  it("zoomOut", () => {
    canvasShortcuts.zoomOut.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/zoomCentered", {
      delta: -1,
    });
  });

  it("zoomTo75", () => {
    canvasShortcuts.zoomTo75.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/zoomCentered", {
      factor: 0.75,
    });
  });

  it("zoomTo100", () => {
    canvasShortcuts.zoomTo100.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/zoomCentered", {
      factor: 1,
    });
  });

  it("zoomTo125", () => {
    canvasShortcuts.zoomTo125.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/zoomCentered", {
      factor: 1.25,
    });
  });

  it("zoomTo150", () => {
    canvasShortcuts.zoomTo150.execute({ $store });
    expect(mockDispatch).toHaveBeenCalledWith("canvas/zoomCentered", {
      factor: 1.5,
    });
  });
});
