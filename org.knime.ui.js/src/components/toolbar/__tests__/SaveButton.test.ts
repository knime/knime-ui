import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";
import { KdsButton } from "@knime/kds-components";

import { SpaceProvider } from "@/api/gateway-api/generated-api";
import IconComponent from "@/assets/redo.svg";
import {
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SaveButton from "../SaveButton.vue";

const mockedShortcuts = {
  save: {
    icon: IconComponent,
    title: "save workflow",
    text: "Save",
    hotkeyText: "Ctrl S",
  },
  saveAs: {
    icon: IconComponent,
    title: "save workflow as",
    text: "Save as",
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

vi.mock("@/services/shortcuts", () => ({
  useShortcuts: vi.fn(() => $shortcuts),
}));

describe("SaveButton.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $shortcuts.isEnabled.mockReturnValue(true);
  });

  type MountOpts = {
    isUnknownProject?: boolean;
  };

  const doMount = ({ isUnknownProject }: MountOpts = {}) => {
    const mockedStores = mockStores();

    const projectId = "project1";

    mockedStores.applicationStore.activeProjectId = projectId;
    mockedStores.applicationStore.openProjects = [
      createProject({
        projectId,
        name: "The World Is Not Enough",
        origin: isUnknownProject
          ? {
              providerId: "unknown-provider-id",
              spaceId: "unknown-space-id",
              itemId: "unknown-item-id",
            }
          : {
              providerId: "provider1",
              spaceId: "test-space-id",
              itemId: "test-item-id",
            },
      }),
    ];

    const provider = createSpaceProvider({
      id: "provider1",
      name: "MI6",
      type: SpaceProvider.TypeEnum.HUB,
      connected: true,
      spaceGroups: [
        createSpaceGroup({
          id: "group1",
          name: "Double 0 program",
          spaces: [
            createSpace({
              id: "test-space-id",
              name: "Test Space",
              owner: "bond",
            }),
          ],
        }),
      ],
    });

    mockedStores.spaceProvidersStore.setSpaceProviders({
      [provider.id]: provider,
    });

    const wrapper = mount(SaveButton, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, $shortcuts, mockedStores };
  };

  describe("main action", () => {
    it.each([
      ["Save", false, "save"],
      ["Save as", true, "saveAs"],
    ])(
      "renders correct action for known projects (%)",
      async (action, isUnknownProject, shortcutAction) => {
        const { wrapper } = doMount({ isUnknownProject });

        const mainAction = wrapper.findComponent(KdsButton);
        expect(mainAction.exists()).toBe(true);
        expect(mainAction.props("label")).toBe(action);
        await wrapper.findComponent(KdsButton).trigger("click");
        expect($shortcuts.dispatch).toHaveBeenCalledWith(shortcutAction);
      },
    );

    it("renders disabled", () => {
      $shortcuts.isEnabled.mockReturnValueOnce(false);
      const { wrapper } = doMount();

      const saveButton = wrapper.getComponent(KdsButton);
      expect(saveButton.attributes("disabled")).toBeDefined();
    });
  });

  describe("renders submenu", () => {
    it("renders a submenu when project can do a save as a main action", () => {
      const { wrapper } = doMount();

      expect(wrapper.classes()).toContain("split-button");
      expect(wrapper.findComponent(SubMenu).exists()).toBeTruthy();
      expect(wrapper.findComponent(SubMenu).props("items").length).toBe(2);
    });

    it("does not render submenu when main action is save as", () => {
      const { wrapper } = doMount({ isUnknownProject: true });
      expect(wrapper.classes()).not.toContain("split-button");
      expect(wrapper.findComponent(SubMenu).exists()).toBe(false);
    });

    it("dispatches shortcut handler for submenu entries", async () => {
      const { wrapper } = doMount();

      await wrapper.find(".submenu-toggle").trigger("click");
      await wrapper.findAll(".submenu li").at(0)?.trigger("click");
      expect($shortcuts.dispatch).toHaveBeenLastCalledWith("saveAs");
      await wrapper.find(".submenu-toggle").trigger("click");
      await wrapper.findAll(".submenu li").at(1)?.trigger("click");
      expect($shortcuts.dispatch).toHaveBeenLastCalledWith("export");
    });
  });
});
