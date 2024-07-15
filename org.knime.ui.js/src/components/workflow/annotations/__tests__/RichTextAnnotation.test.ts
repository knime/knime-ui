import { mockVuexStore } from "@/test/utils";
import { shallowRef } from "vue";
import { mount, VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi, type Mock } from "vitest";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";

import * as $colors from "@/style/colors";

import RichTextAnnotation from "../RichTextAnnotation.vue";
import CreateLinkModal from "../CreateLinkModal.vue";
import ColorSelectionDialog from "../ColorSelectionDialog.vue";
import RichTextAnnotationToolbar from "../RichTextAnnotationToolbar.vue";
import ColorIcon from "../ColorIcon.vue";

// mock for editor's isActive function. declared separately due to mock hoisting via vi.mock
const isActive = vi.fn();

const createMockEditor = (params: any) => {
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
    "setLink",
    "unsetLink",
    "insertContent",
    "insertContentAt",
  ] as const;

  type Actions = Record<
    (typeof actionNames)[number],
    Mock<any[], { run: () => void }>
  >;

  const actions: Actions = actionNames.reduce((acc, action) => {
    acc[action] = vi.fn(() => ({ run: () => {} }));
    return acc;
  }, {} as Actions);

  return shallowRef({
    isActive,
    chain: () => ({
      focus: () => ({
        ...actions,
        extendMarkRange: vi.fn(() => ({ unsetLink: actions.unsetLink })),
      }),
    }),
    setEditable: vi.fn(),
    getHTML: () => "<p>mock html</p>",
    commands: {
      insertContent: vi.fn(),
      setTextSelection: vi.fn(),
      focus: vi.fn(),
    },
    view: { state: { selection: { from: 5 } } },
    params,
  });
};

let mockEditor: ReturnType<typeof createMockEditor>;

vi.mock("@tiptap/vue-3", () => {
  return {
    EditorContent: {
      template: "<div></div>",
    },
    useEditor: vi.fn((params) => {
      mockEditor = createMockEditor(params);
      return mockEditor;
    }),
  };
});

describe("RichTextAnnotation.vue", () => {
  const defaultProps = {
    id: "1",
    editable: true,
    initialValue: "Hello",
    annotationBounds: { x: 0, y: 0, width: 10, height: 10 },
    initialBorderColor: "#000",
  };

  const doMount = ({ props = {} } = {}) => {
    const $store = mockVuexStore({
      canvas: {
        state: {
          zoomFactor: 1,
        },
      },
    });

    const wrapper = mount(RichTextAnnotation, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
        stubs: { FloatingMenu: true },
      },
    });

    return { wrapper };
  };

  it("should render all options", () => {
    const { wrapper } = doMount();

    expect(wrapper.findAll(".toolbar-button").length).toBe(9);
  });

  it("should set the active state correctly", () => {
    isActive.mockImplementation((name) => name === "bold");
    const { wrapper } = doMount();

    expect(
      wrapper.findAllComponents(FunctionButton).at(1).props("active"),
    ).toBe(true);
    expect(
      wrapper.findAllComponents(FunctionButton).at(2).props("active"),
    ).toBe(false);
  });

  it("should execute the toolbar action", () => {
    const { wrapper } = doMount();

    wrapper
      .findAllComponents(FunctionButton)
      .at(1)
      .vm.$emit("click", { stopPropagation: vi.fn() });

    expect(mockEditor.value.chain().focus().toggleBold).toHaveBeenCalled();
    expect(
      mockEditor.value.chain().focus().toggleBulletList,
    ).not.toHaveBeenCalled();
  });

  describe("heading dropdown", () => {
    it("shows normal text for non headings", () => {
      const { wrapper } = doMount();

      expect(wrapper.findAllComponents(FunctionButton).at(0).text()).toBe(
        "Normal text",
      );
    });

    it("should select the current level", () => {
      isActive.mockImplementation((name) => name === "heading");
      const { wrapper } = doMount();

      expect(wrapper.findAllComponents(FunctionButton).at(0).text()).toBe(
        "Heading 1",
      );
    });

    it("should change the heading", async () => {
      const { wrapper } = doMount();

      // open headings submenu
      await wrapper.find(".submenu-toggle").trigger("click");
      // click on Heading 2
      await wrapper.findAll(".submenu li").at(2).trigger("click");

      expect(mockEditor.value.chain().focus().setHeading).toHaveBeenCalled();
      expect(
        mockEditor.value.chain().focus().toggleBulletList,
      ).not.toHaveBeenCalled();
    });
  });

  describe("link", () => {
    it("should add the link", () => {
      const { wrapper } = doMount();

      wrapper
        .findComponent(CreateLinkModal)
        .vm.$emit("addLink", "test text", "https://test.url");

      expect(
        mockEditor.value.chain().focus().extendMarkRange().unsetLink,
      ).toHaveBeenCalled();
      expect(
        mockEditor.value.chain().focus().insertContent,
      ).toHaveBeenCalledWith([{ text: " ", type: "text" }]);

      expect(
        mockEditor.value.chain().focus().insertContentAt,
      ).toHaveBeenCalledWith(5, [{ type: "text", text: "test text" }]);
      expect(mockEditor.value.commands.setTextSelection).toHaveBeenCalledWith({
        from: 5,
        to: 5,
      });

      expect(mockEditor.value.chain().focus().setLink).toHaveBeenCalledWith({
        href: "https://test.url",
      });
    });
  });

  describe("border color selection dialog", () => {
    const getDialogToggle = (wrapper: VueWrapper<any>) =>
      wrapper.find(".border-color-tool");

    const openDialog = (wrapper: VueWrapper<any>) =>
      getDialogToggle(wrapper).trigger("click");

    it("should open the border color selection dialog", async () => {
      const { wrapper } = doMount({
        props: { initialBorderColor: $colors.Aquamarine },
      });

      expect(wrapper.findComponent(ColorSelectionDialog).exists()).toBe(false);

      await openDialog(wrapper);
      expect(wrapper.findComponent(ColorSelectionDialog).exists()).toBe(true);
      expect(
        wrapper.findComponent(ColorSelectionDialog).props("activeColor"),
      ).toBe($colors.Aquamarine);
    });

    it("should set the preview border color", async () => {
      const { wrapper } = doMount({
        props: { initialBorderColor: $colors.Aquamarine },
      });

      await openDialog(wrapper);
      const someColorButton = wrapper
        .findComponent(ColorSelectionDialog)
        .findAll("button")
        .at(3);
      const someColor = someColorButton.find("circle").attributes("stroke");

      await someColorButton.trigger("mouseenter");

      expect(
        getDialogToggle(wrapper).findComponent(ColorIcon).props("color"),
      ).toBe(someColor);

      expect(
        wrapper
          .findComponent(RichTextAnnotationToolbar)
          .emitted("previewBorderColor")[0][0],
      ).toEqual(someColor);
    });

    it("should close the border color selection dialog after a color is selected", async () => {
      const { wrapper } = doMount({
        props: { initialBorderColor: $colors.Aquamarine },
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
