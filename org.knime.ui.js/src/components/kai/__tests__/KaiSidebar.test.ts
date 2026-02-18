import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { mockStores } from "@/test/utils/mockStores";
import KaiSidebar from "../KaiSidebar.vue";

// Stub heavy child components to keep the test lightweight
vi.mock("@/components/common/side-panel/SidebarPanelLayout.vue", () => ({
  default: {
    name: "SidebarPanelLayout",
    template: '<div><slot name="header" /><slot /></div>',
  },
}));

vi.mock("../chat/Chat.vue", () => ({
  default: { name: "Chat", template: "<div />" },
}));

vi.mock("../KaiExtensionPanel.vue", () => ({
  default: { name: "KaiExtensionPanel", template: "<div />" },
}));

const mockPanelComponent = ref<object | null>(null);
vi.mock("@/components/kai/panels/useKaiPanels", () => ({
  useKaiPanels: vi.fn().mockImplementation(() => ({
    panelComponent: mockPanelComponent,
  })),
}));

describe("KaiSidebar.vue", () => {
  const doMount = () => {
    const stores = mockStores({ stubActions: true });
    const wrapper = mount(KaiSidebar, {
      global: { plugins: [stores.testingPinia] },
    });
    return { wrapper, stores };
  };

  describe("submenu items", () => {
    it("renders both the clear-chat and reset-permissions menu items", () => {
      const { wrapper } = doMount();
      const items = wrapper.findComponent(SubMenu).props("items") as any[];

      expect(items).toHaveLength(2);
      expect(items[0].text).toBe("Clear chat");
      expect(items[1].text).toBe("Reset permissions for this workflow");
    });

    it("calls clearConversation when the clear-chat item is clicked", async () => {
      const { wrapper, stores } = doMount();
      const items = wrapper.findComponent(SubMenu).props("items") as any[];
      const clearChatItem = items[0];

      await wrapper
        .findComponent(SubMenu)
        .vm.$emit("item-click", {}, clearChatItem);

      expect(stores.aiAssistantStore.clearConversation).toHaveBeenCalledWith({
        chainType: "qa",
      });
    });

    it("calls revokePermissionsForAllActionsForActiveProject when the reset-permissions item is clicked", async () => {
      const { wrapper, stores } = doMount();
      const items = wrapper.findComponent(SubMenu).props("items") as any[];
      const resetPermissionsItem = items[1];

      await wrapper
        .findComponent(SubMenu)
        .vm.$emit("item-click", {}, resetPermissionsItem);

      expect(
        stores.aiSettingsStore.revokePermissionsForAllActionsForActiveProject,
      ).toHaveBeenCalled();
    });
  });
});
