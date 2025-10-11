import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

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
    it("execute selectAll", async () => {
      const { selectionStore, workflowStore } = mockStores();

      workflowStore.activeWorkflow = createWorkflow({
        nodes: {},
        workflowAnnotations: [],
      });

      vi.mocked(selectionStore.tryClearSelection).mockResolvedValueOnce({
        wasAborted: false,
      });
      selectionShortcuts.selectAll.execute(mockShortcutContext());

      await flushPromises();
      expect(selectionStore.tryClearSelection).toHaveBeenCalled();
      expect(selectionStore.selectAllObjects).toHaveBeenCalled();
    });

    it("execute deselectAll", async () => {
      const { selectionStore } = mockStores();

      await selectionShortcuts.deselectAll.execute(mockShortcutContext());
      expect(selectionStore.deselectAllObjects).toHaveBeenCalled();
    });
  });
});
