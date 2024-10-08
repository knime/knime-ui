import { SubMenu } from "@knime/components";
import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import IconComponent from "@/assets/redo.svg";
import ToolbarButton from "@/components/common/ToolbarButton.vue";
import ToolbarShortcutButton from "../ToolbarShortcutButton.vue";

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
  },
  export: {
    icon: IconComponent,
    title: "Export",
    text: "Export",
    hotkeyText: "Ctrl E",
  },
  noText: {
    title: "save workflow",
  },
  disabledShortcut: {
    icon: IconComponent,
    title: "save workflow",
    text: "save",
    hotkeyText: "Ctrl S",
  },
};

const disabledShortcuts = {
  disabledShortcut: true,
};

const $shortcuts = {
  get: vi.fn().mockImplementation((name) => mockedShortcuts[name]),
  isEnabled: vi.fn().mockImplementation((name) => !disabledShortcuts[name]),
  dispatch: vi.fn(),
};

vi.mock("@/plugins/shortcuts", () => ({
  useShortcuts: () => $shortcuts,
}));

describe("ToolbarShortcutButton.vue", () => {
  const doMount = ({ props } = { props: {} }) => {
    const propsWithDefaults = {
      name: "save",
      withText: true,
      dropdown: [],
      ...props,
    };

    const wrapper = mount(ToolbarShortcutButton, {
      props: propsWithDefaults,
    });
    return { wrapper };
  };

  describe("renders button", () => {
    it("fetches shortcut", () => {
      doMount();
      expect($shortcuts.get).toHaveBeenCalledWith("save");
    });

    it("renders full info", () => {
      const { wrapper } = doMount();

      const toolbarButton = wrapper.getComponent(ToolbarButton);
      expect(toolbarButton.text()).toBe("save");
      expect(toolbarButton.classes()).toContain("with-text");
      expect(toolbarButton.attributes("title")).toBe("save workflow – Ctrl S");

      expect(toolbarButton.attributes("disabled")).toBeUndefined();

      expect(wrapper.findComponent(IconComponent).exists()).toBe(true);
    });

    it("renders only with title", () => {
      const { wrapper } = doMount({ props: { name: "noText" } });

      const toolbarButton = wrapper.getComponent(ToolbarButton);
      expect(toolbarButton.text()).toBeFalsy();
      expect(toolbarButton.classes()).not.toContain("with-text");
      expect(toolbarButton.attributes("title")).toBe("save workflow");

      expect(wrapper.findComponent(IconComponent).exists()).toBe(false);
    });

    it("renders disabled", async () => {
      const { wrapper } = doMount({
        props: { name: "disabledShortcut" },
      });

      expect($shortcuts.isEnabled).toHaveBeenCalledWith("save");
      await nextTick();

      const toolbarButton = wrapper.getComponent(ToolbarButton);
      expect(toolbarButton.attributes("disabled")).toBeDefined();
    });

    it("dispatches shortcut handler", async () => {
      const { wrapper } = doMount();

      await wrapper.getComponent(ToolbarButton).trigger("click");
      expect($shortcuts.dispatch).toHaveBeenCalledWith("save");
    });

    it("shows text if one is given", () => {
      const { wrapper } = doMount({ props: { withText: true } });
      expect(wrapper.getComponent(ToolbarButton).text()).contain("save");
    });

    it("hides text if withText is false", () => {
      const { wrapper } = doMount({ props: { withText: false } });
      expect(wrapper.getComponent(ToolbarButton).text()).not.contain("save");
    });
  });

  describe("renders submenu", () => {
    const dropdown = [
      { name: "save" },
      { name: "saveAs", separator: true },
      { name: "export" },
    ];

    it("renders a submenu if dropdown prop is non empty", () => {
      const { wrapper } = doMount({ props: { dropdown } });
      expect(wrapper.findComponent(SubMenu).exists()).toBeTruthy();
      expect(wrapper.findComponent(SubMenu).props("items").length).toBe(3);
    });

    it("correctly maps submenu items", () => {
      const { wrapper } = doMount({ props: { dropdown } });
      const subMenuItems = (wrapper.vm as any).subMenuItems;

      expect(subMenuItems).toEqual([
        expect.objectContaining({
          name: "save",
          text: "save",
          title: "save workflow",
          hotkeyText: "Ctrl S",
          icon: IconComponent,
          disabled: false,
          separator: undefined,
        }),
        expect.objectContaining({
          name: "saveAs",
          text: "save as",
          title: "save workflow as",
          hotkeyText: undefined,
          icon: IconComponent,
          disabled: false,
          separator: true,
        }),
        expect.objectContaining({
          name: "export",
          text: "Export",
          title: "Export",
          hotkeyText: "Ctrl E",
          icon: IconComponent,
          disabled: false,
          separator: undefined,
        }),
      ]);
    });

    it("dispatches shortcut handler for submenu entries", async () => {
      const { wrapper } = doMount({ props: { dropdown } });

      // open submenu
      await wrapper.find(".submenu-toggle").trigger("click");

      // click on saveAs
      await wrapper.findAll(".submenu li").at(1).trigger("click");

      expect($shortcuts.dispatch).toHaveBeenCalledWith("saveAs");
    });
  });
});
