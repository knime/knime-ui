import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import RichTextEditor from "webapps-common/ui/components/forms/RichTextEditor/RichTextEditor.vue";
import MetadataDescription from "../MetadataDescription.vue";

describe("MetadataDescription.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const defaultProps = {
      modelValue: "Lorem ipsum",
      editable: false,
    };

    const wrapper = mount(MetadataDescription, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  it("should render placeholder when no description is set", () => {
    const { wrapper } = doMount({ props: { modelValue: "" } });

    expect(wrapper.text()).toMatch("No description has been set yet");
  });

  it("should render the description editor", async () => {
    const { wrapper } = doMount();

    const editor = wrapper.findComponent(RichTextEditor);
    expect(editor.props("editable")).toBe(false);

    await wrapper.setProps({ editable: true });

    expect(editor.props("editable")).toBe(true);

    expect(editor.props("baseExtensions")).toEqual({
      bold: true,
      italic: true,
      bulletList: true,
      orderedList: true,
      underline: true,
    });

    editor.vm.$emit("update:modelValue", "<p>Lorem ipsum</p>");
    expect(wrapper.emitted("update:modelValue")[0][0]).toBe(
      "<p>Lorem ipsum</p>"
    );
  });

  it("should not emit content changes from the editor if description is not editable", () => {
    const { wrapper } = doMount({ props: { editable: false } });

    const editor = wrapper.findComponent(RichTextEditor);
    editor.vm.$emit("update:modelValue", "<p>Lorem ipsum</p>");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
