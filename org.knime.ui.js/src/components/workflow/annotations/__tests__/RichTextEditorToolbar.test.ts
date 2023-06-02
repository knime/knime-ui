import { describe, expect, it, vi, type Mock } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import type { Bounds } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors.mjs";

import RichTextEditorToolbar from "../RichTextEditorToolbar.vue";
import ColorSelectionDialog from "../ColorSelectionDialog.vue";
import ColorIcon from "../ColorIcon.vue";

const createMockEditor = () => {
  const actionNames = [
    "toggleBold",
    "toggleItalic",
    "toggleUnderline",
    "toggleBulletList",
    "toggleOrderedList",
    "setTextAlign",
    "setTextAlign",
    "setTextAlign",
    "setHeading",
  ] as const;

  type Actions = Record<
    (typeof actionNames)[number],
    Mock<any[], { run: () => void }>
  >;

  const actions: Actions = actionNames.reduce((acc, action) => {
    acc[action] = vi.fn(() => ({ run: () => {} }));
    return acc;
  }, {} as Actions);

  return {
    isActive: vi.fn(),
    chain: () => ({
      focus: () => actions,
    }),
  };
};

const mockEditor = createMockEditor();

describe("RichTextEditorToolbar.vue", () => {
  const annotationBounds: Bounds = { x: 0, y: 0, width: 100, height: 50 };

  const doMount = ({ props = {} } = {}) => {
    const $store = mockVuexStore({
      canvas: {
        state: {
          zoomFactor: 1,
        },
      },
    });

    const defaulProps = {
      editor: mockEditor,
      annotationBounds,
      activeBorderColor: $colors.defaultAnnotationBorderColor,
    };

    const wrapper = mount(RichTextEditorToolbar, {
      props: { ...defaulProps, ...props },
      global: {
        plugins: [$store],
        stubs: { FloatingMenu: true },
      },
    });

    return { wrapper, $store };
  };

  it("should render all options", () => {
    const { wrapper } = doMount();

    expect(wrapper.findAll(".toolbar-button").length).toBe(9);
  });

  it("should set the active state correctly", () => {
    mockEditor.isActive.mockImplementation((name) => name === "bold");
    const { wrapper } = doMount();

    expect(
      wrapper.findAllComponents(FunctionButton).at(1).props("active")
    ).toBe(true);
    expect(
      wrapper.findAllComponents(FunctionButton).at(2).props("active")
    ).toBe(false);
  });

  it("should execute the toolbar action", () => {
    const { wrapper } = doMount();

    wrapper
      .findAllComponents(FunctionButton)
      .at(1)
      .vm.$emit("click", { stopPropagation: vi.fn() });
    expect(mockEditor.chain().focus().toggleBold).toHaveBeenCalled();
    expect(mockEditor.chain().focus().toggleBulletList).not.toHaveBeenCalled();
  });

  describe("heading dropdown", () => {
    it("shows normal text for non headings", () => {
      const { wrapper } = doMount();

      expect(wrapper.findAllComponents(FunctionButton).at(0).text()).toBe(
        "Normal text"
      );
    });

    it("should select the current level", () => {
      mockEditor.isActive.mockImplementation((name) => name === "heading");
      const { wrapper } = doMount();

      expect(wrapper.findAllComponents(FunctionButton).at(0).text()).toBe(
        "Heading 1"
      );
    });

    it("should change the heading", async () => {
      const { wrapper } = doMount();

      // open headings submenu
      await wrapper.find(".submenu-toggle").trigger("click");
      // click on Heading 2
      await wrapper.findAll(".submenu li").at(2).trigger("click");

      expect(mockEditor.chain().focus().setHeading).toHaveBeenCalled();
      expect(
        mockEditor.chain().focus().toggleBulletList
      ).not.toHaveBeenCalled();
    });
  });

  describe("border color selection dialog", () => {
    const getDialogToggle = (wrapper: VueWrapper<any>) =>
      wrapper.find(".border-color-tool");
    const openDialog = (wrapper: VueWrapper<any>) =>
      getDialogToggle(wrapper).trigger("click");

    it("should open the border color selection dialog", async () => {
      const { wrapper } = doMount({
        props: { activeBorderColor: $colors.Aquamarine },
      });

      expect(wrapper.findComponent(ColorSelectionDialog).exists()).toBe(false);

      await openDialog(wrapper);
      expect(wrapper.findComponent(ColorSelectionDialog).exists()).toBe(true);
      expect(
        wrapper.findComponent(ColorSelectionDialog).props("activeColor")
      ).toBe($colors.Aquamarine);
    });

    it("should set the preview border color", async () => {
      const { wrapper } = doMount({
        props: { activeBorderColor: $colors.Aquamarine },
      });

      await openDialog(wrapper);
      const someColorButton = wrapper
        .findComponent(ColorSelectionDialog)
        .findAll("button")
        .at(3);
      const someColor = someColorButton.find("circle").attributes("stroke");

      await someColorButton.trigger("mouseenter");

      expect(
        getDialogToggle(wrapper).findComponent(ColorIcon).props("color")
      ).toBe(someColor);
      expect(wrapper.emitted("previewBorderColor")[0][0]).toEqual(someColor);
    });

    it("should close the border color selection dialog after a color is selected", async () => {
      const { wrapper } = doMount({
        props: { activeBorderColor: $colors.Aquamarine },
      });

      await openDialog(wrapper);
      const someColorButton = wrapper
        .findComponent(ColorSelectionDialog)
        .findAll("button")
        .at(3);
      const someColor = someColorButton.find("circle").attributes("stroke");

      await someColorButton.trigger("click");

      expect(wrapper.emitted("changeBorderColor")[0][0]).toEqual(someColor);
    });
  });
});
