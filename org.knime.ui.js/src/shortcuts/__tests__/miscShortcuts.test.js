import { describe, expect, it } from "vitest";

import { mockStores } from "@/test/utils/mockStores";
import { selectionShortcuts, sidePanelShortcuts } from "../miscShortcuts";

describe("miscShortcuts", () => {
  describe("sidePanelShortcuts", () => {
    it("execute toggleSidePanel", () => {
      const { panelStore } = mockStores();

      sidePanelShortcuts.toggleSidePanel.execute();
      expect(panelStore.toggleExpanded).toHaveBeenCalled();
    });
  });

  describe("selectionShortcuts", () => {
    it("execute selectAll", () => {
      const { selectionStore, workflowStore } = mockStores();

      workflowStore.activeWorkflow = {
        nodes: [],
        workflowAnnotations: [],
      };
      selectionShortcuts.selectAll.execute();
      expect(selectionStore.selectAllObjects).toHaveBeenCalled();
    });

    it("execute deselectAll", () => {
      const { selectionStore } = mockStores();

      selectionShortcuts.deselectAll.execute();
      expect(selectionStore.deselectAllObjects).toHaveBeenCalled();
    });
  });
});
