import { describe, expect, it } from "vitest";

import { loadStore } from "./loadStore";

describe("workflow::floatingMenus", () => {
  describe("quickActionMenu", () => {
    it("opens the quick add node menu", async () => {
      const { store } = await loadStore();

      expect(store.state.workflow.quickActionMenu.isOpen).toBe(false);

      await store.dispatch("workflow/openQuickActionMenu", {
        props: { someProp: "val" },
        events: { "menu-close": () => {} },
      });

      expect(store.state.workflow.quickActionMenu.isOpen).toBe(true);
      expect(store.state.workflow.quickActionMenu.props).toStrictEqual({
        someProp: "val",
      });
      expect(store.state.workflow.quickActionMenu.events).toMatchObject({
        "menu-close": expect.anything(),
      });
    });

    it("closes the quick add node menu", async () => {
      const { store } = await loadStore();

      await store.dispatch("workflow/openQuickActionMenu", {});
      expect(store.state.workflow.quickActionMenu.isOpen).toBe(true);

      await store.dispatch("workflow/closeQuickActionMenu");
      expect(store.state.workflow.quickActionMenu.isOpen).toBe(false);
    });
  });

  describe("portTypeMenu", () => {
    it("sets the preview of a portTypeMenu", async () => {
      const { store } = await loadStore();
      store.commit("workflow/setPortTypeMenuPreviewPort", { typeId: "prev" });

      expect(store.state.workflow.portTypeMenu.previewPort).toStrictEqual({
        typeId: "prev",
      });
    });

    it("opens the port type menu", async () => {
      const { store } = await loadStore();

      expect(store.state.workflow.portTypeMenu.isOpen).toBe(false);

      await store.dispatch("workflow/openPortTypeMenu", {
        nodeId: "node-id",
        props: { side: "out" },
        startNodeId: "start-node-id",
        events: { "menu-close": () => {} },
      });

      expect(store.state.workflow.portTypeMenu.isOpen).toBe(true);
      expect(store.state.workflow.portTypeMenu.nodeId).toBe("node-id");
      expect(store.state.workflow.portTypeMenu.startNodeId).toBe(
        "start-node-id",
      );
      expect(store.state.workflow.portTypeMenu.previewPort).toBeNull();
      expect(store.state.workflow.portTypeMenu.props).toStrictEqual({
        side: "out",
      });
      expect(store.state.workflow.portTypeMenu.events).toMatchObject({
        "menu-close": expect.anything(),
      });
    });

    it("closes the port type menu", async () => {
      const { store } = await loadStore();

      await store.dispatch("workflow/openPortTypeMenu", {});
      expect(store.state.workflow.portTypeMenu.isOpen).toBe(true);

      await store.dispatch("workflow/closePortTypeMenu");
      expect(store.state.workflow.portTypeMenu.isOpen).toBe(false);
    });
  });
});
