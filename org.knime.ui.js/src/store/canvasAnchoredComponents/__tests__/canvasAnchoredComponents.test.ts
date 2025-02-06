import { describe, expect, it } from "vitest";

import { mockStores } from "@/test/utils/mockStores";

describe("canvasAnchoredComponents", () => {
  describe("quickActionMenu", () => {
    it("opens the quick add node menu", () => {
      const { floatingMenusStore } = mockStores();

      expect(floatingMenusStore.quickActionMenu.isOpen).toBe(false);

      floatingMenusStore.openQuickActionMenu({
        props: { position: { x: 0, y: 0 } },
        events: { menuClose: () => {} },
      });

      expect(floatingMenusStore.quickActionMenu.isOpen).toBe(true);
      expect(floatingMenusStore.quickActionMenu.props).toStrictEqual({
        position: { x: 0, y: 0 },
      });
      expect(floatingMenusStore.quickActionMenu.events).toMatchObject({
        menuClose: expect.anything(),
      });
    });

    it("closes the quick add node menu", () => {
      const { floatingMenusStore } = mockStores();

      // @ts-ignore
      floatingMenusStore.openQuickActionMenu({});
      expect(floatingMenusStore.quickActionMenu.isOpen).toBe(true);

      floatingMenusStore.closeQuickActionMenu();
      expect(floatingMenusStore.quickActionMenu.isOpen).toBe(false);
    });
  });

  describe("portTypeMenu", () => {
    it("sets the preview of a portTypeMenu", () => {
      const { floatingMenusStore } = mockStores();
      floatingMenusStore.setPortTypeMenuPreviewPort({ typeId: "prev" });

      expect(floatingMenusStore.portTypeMenu.previewPort).toStrictEqual({
        typeId: "prev",
      });
    });

    it("opens the port type menu", () => {
      const { floatingMenusStore } = mockStores();

      expect(floatingMenusStore.portTypeMenu.isOpen).toBe(false);

      floatingMenusStore.openPortTypeMenu({
        nodeId: "node-id",
        props: { side: "output", position: { x: 0, y: 0 }, portGroups: null },
        startNodeId: "start-node-id",
        events: { menuClose: () => {} },
      });

      expect(floatingMenusStore.portTypeMenu.isOpen).toBe(true);
      expect(floatingMenusStore.portTypeMenu.nodeId).toBe("node-id");
      expect(floatingMenusStore.portTypeMenu.startNodeId).toBe("start-node-id");
      expect(floatingMenusStore.portTypeMenu.previewPort).toBeNull();
      expect(floatingMenusStore.portTypeMenu.props).toStrictEqual({
        side: "output",
        position: { x: 0, y: 0 },
        portGroups: null,
      });
      expect(floatingMenusStore.portTypeMenu.events).toMatchObject({
        menuClose: expect.anything(),
      });
    });

    it("closes the port type menu", () => {
      const { floatingMenusStore } = mockStores();

      // @ts-ignore
      floatingMenusStore.openPortTypeMenu({});
      expect(floatingMenusStore.portTypeMenu.isOpen).toBe(true);

      floatingMenusStore.closePortTypeMenu();
      expect(floatingMenusStore.portTypeMenu.isOpen).toBe(false);
    });
  });
});
