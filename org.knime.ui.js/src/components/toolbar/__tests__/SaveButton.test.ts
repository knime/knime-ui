import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";
import { KdsButton } from "@knime/kds-components";

import { SpaceGroup, SpaceProvider } from "@/api/gateway-api/generated-api";
import IconComponent from "@/assets/redo.svg";
import { mockStores } from "@/test/utils/mockStores";
import SaveButton from "../SaveButton.vue";

const mockedShortcuts = {
  save: {
    icon: IconComponent,
    title: "save workflow",
    text: "save",
    hotkeyText: "Ctrl S",
  },
  saveAs: {
    icon: IconComponent,
    title: "save workflow as",
    text: "save as",
    hotkeyText: "Ctrl Shift S",
  },
  export: {
    icon: IconComponent,
    title: "Export",
    text: "Export",
    hotkeyText: "Ctrl E",
  },
};

const $shortcuts = {
  get: vi.fn().mockImplementation((name) => mockedShortcuts[name]),
  getText: vi
    .fn()
    .mockImplementation((name) => mockedShortcuts[name]?.text || ""),
  isEnabled: vi.fn(),
  dispatch: vi.fn(),
};

vi.mock("@/plugins/shortcuts", () => ({
  useShortcuts: vi.fn(() => $shortcuts),
}));

describe("SaveButton.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $shortcuts.isEnabled.mockReturnValue(true);
  });

  const setupStoresForProject = ({
    projectId,
    hasValidOrigin = true,
  }: {
    projectId: string;
    hasValidOrigin?: boolean;
  }) => {
    const stores = mockStores();

    stores.applicationStore.activeProjectId = projectId;
    stores.applicationStore.openProjects = [
      {
        projectId,
        name: "The World Is Not Enough",
        origin: hasValidOrigin
          ? {
              providerId: "provider1",
              spaceId: "test-space-id",
              itemId: "test-item-id",
            }
          : {
              providerId: "unknown-provider-id",
              spaceId: "unknown-space-id",
              itemId: "unknown-item-id",
            },
      },
    ];

    if (hasValidOrigin) {
      stores.spaceProvidersStore.spaceProviders = {
        provider1: {
          id: "provider1",
          name: "MI6",
          type: SpaceProvider.TypeEnum.HUB,
          connected: true,
          connectionMode: SpaceProvider.ConnectionModeEnum.AUTHENTICATED,
          spaceGroups: [
            {
              id: "group1",
              name: "Double 0 program",
              type: SpaceGroup.TypeEnum.USER,
              spaces: [
                {
                  id: "test-space-id",
                  name: "Test Space",
                  owner: "bond",
                },
              ],
            },
          ],
        },
      };
    }

    return stores;
  };

  const doMount = ({ props } = { props: {} }) => {
    mockStores();

    const propsWithDefaults = {
      name: "save",
      withText: true,
      dropdown: [],
      ...props,
    };

    const wrapper = mount(SaveButton, {
      props: propsWithDefaults,
    });
    return { wrapper, $shortcuts };
  };

  describe("renders button", () => {
    it("fetches shortcut", () => {
      doMount();
      expect($shortcuts.get).toHaveBeenCalledWith("save");
    });

    it("renders full info", () => {
      const { wrapper } = doMount();

      const saveButton = wrapper.findComponent(KdsButton);
      expect(saveButton.text()).toBe("save");
      expect(saveButton.attributes("title")).toBe("save workflow – Ctrl S");
      expect(saveButton.attributes("disabled")).toBeUndefined();
      expect(saveButton.find(".kds-icon").exists()).toBe(true);
    });

    it("renders disabled", async () => {
      $shortcuts.isEnabled.mockReturnValueOnce(false);
      const { wrapper } = doMount();

      expect($shortcuts.isEnabled).toHaveBeenCalledWith("save");
      await nextTick();

      const saveButton = wrapper.getComponent(KdsButton);
      expect(saveButton.attributes("disabled")).toBeDefined();
    });

    it("dispatches shortcut handler", async () => {
      const { wrapper } = doMount();

      await wrapper.getComponent(KdsButton).find("button").trigger("click");
      expect($shortcuts.dispatch).toHaveBeenCalledWith("save");
    });
  });

  describe("renders submenu", () => {
    it("renders a submenu when project is known", () => {
      const stores = setupStoresForProject({
        projectId: "test-project-id",
        hasValidOrigin: true,
      });

      const wrapper = mount(SaveButton, {
        global: {
          plugins: [stores.testingPinia],
        },
      });

      expect(wrapper.findComponent(SubMenu).exists()).toBeTruthy();
      expect(wrapper.findComponent(SubMenu).props("items").length).toBe(2);
    });

    it("does not render submenu when project is unknown", () => {
      const stores = setupStoresForProject({
        projectId: "unknown-project-id",
        hasValidOrigin: false,
      });

      const wrapper = mount(SaveButton, {
        global: {
          plugins: [stores.testingPinia],
        },
      });

      expect(wrapper.findComponent(SubMenu).exists()).toBeFalsy();
    });

    it("dispatches shortcut handler for submenu entries", async () => {
      const stores = setupStoresForProject({
        projectId: "test-project-id",
        hasValidOrigin: true,
      });

      const wrapper = mount(SaveButton, {
        global: {
          plugins: [stores.testingPinia],
        },
      });

      await wrapper.find(".submenu-toggle").trigger("click");
      await wrapper.findAll(".submenu li").at(0)?.trigger("click");
      expect($shortcuts.dispatch).toHaveBeenLastCalledWith("saveAs");

      await wrapper.find(".submenu-toggle").trigger("click");
      await wrapper.findAll(".submenu li").at(1)?.trigger("click");
      expect($shortcuts.dispatch).toHaveBeenLastCalledWith("export");
    });
  });
});
