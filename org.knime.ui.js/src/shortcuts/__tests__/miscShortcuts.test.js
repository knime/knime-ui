import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectionShortcuts, sidePanelShortcuts } from "../miscShortcuts";

describe("miscShortcuts", () => {
  let mockDispatch, $store, mockCommit;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockCommit = vi.fn();
    $store = {
      dispatch: mockDispatch,
      commit: mockCommit,
    };
  });

  describe("sidePanelShortcuts", () => {
    it("execute toggleSidePanel", () => {
      sidePanelShortcuts.toggleSidePanel.execute({ $store });
      expect(mockCommit).toHaveBeenCalledWith("panel/toggleExpanded");
    });
  });

  describe("selectionShortcuts", () => {
    it("execute selectAll", () => {
      selectionShortcuts.selectAll.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("selection/selectAllObjects");
    });

    it("execute deselectAll", () => {
      selectionShortcuts.deselectAll.execute({ $store });
      expect(mockDispatch).toHaveBeenCalledWith("selection/deselectAllObjects");
    });
  });
});
