import { describe, expect, it } from "vitest";

import { createWorkflow } from "@/test/factories";
import { mockShortcutContext } from "@/test/factories/shortcuts";
import { mockStores } from "@/test/utils/mockStores";
import { selectionShortcuts, sidePanelShortcuts } from "../miscShortcuts";

describe("miscShortcuts", () => {
  describe("sidePanelShortcuts", () => {
    it("execute toggleSidePanel", () => {
      const { panelStore } = mockStores();

      sidePanelShortcuts.toggleSidePanel.execute(mockShortcutContext());
      expect(panelStore.toggleLeftPanel).toHaveBeenCalled();
    });
  });

  describe("selectionShortcuts", () => {
    it("execute selectAll", () => {
      const { selectionStore, workflowStore } = mockStores();

      workflowStore.activeWorkflow = createWorkflow({
        nodes: {},
        workflowAnnotations: [],
      });
      selectionShortcuts.selectAll.execute(mockShortcutContext());
      expect(selectionStore.selectAllObjects).toHaveBeenCalled();
    });

    it("execute deselectAll", async () => {
      const { selectionStore } = mockStores();

      await selectionShortcuts.deselectAll.execute(mockShortcutContext());
      expect(selectionStore.deselectAllObjects).toHaveBeenCalled();
    });
  });
});
