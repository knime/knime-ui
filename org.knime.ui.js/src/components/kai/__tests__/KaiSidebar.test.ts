import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { mockStores } from "@/test/utils/mockStores";
import KaiSidebar from "../KaiSidebar.vue";

const mockPanelComponent = ref<object | null>(null);
vi.mock("@/components/kai/panels/useKaiPanels", () => ({
  useKaiPanels: vi.fn().mockImplementation(() => ({
    panelComponent: mockPanelComponent,
  })),
}));

// Prevent promise leak from createUnwrappedPromise
vi.mock("@knime/utils", async () => {
  const actual = await vi.importActual("@knime/utils");
  return {
    ...actual,
    promise: {
      ...(actual as any).promise,
      createUnwrappedPromise: () => ({
        promise: Promise.resolve(null),
        resolve: () => {},
        reject: () => {},
      }),
    },
  };
});

// Prevent promise leak from module-level side effect in useKdsDynamicModal
vi.mock("@knime/kds-components", () => ({
  KdsValueSwitch: { template: "<div />" },
  useKdsDynamicModal: () => ({
    askConfirmation: vi.fn().mockResolvedValue({ confirmed: false }),
  }),
}));

describe("KaiSidebar.vue", () => {
  const doMount = () => {
    const stores = mockStores({ stubActions: true });
    const wrapper = mount(KaiSidebar, {
      global: {
        plugins: [stores.testingPinia],
        stubs: {
          SidebarPanelLayout: {
            template: '<div><slot name="header" /><slot /></div>',
          },
          Chat: true,
          KaiExtensionPanel: true,
        },
      },
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
