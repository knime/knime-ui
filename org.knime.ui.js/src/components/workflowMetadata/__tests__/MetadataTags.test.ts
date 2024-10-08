import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import { ComboBox, TagList } from "@knime/components";

import MetadataTags from "../MetadataTags.vue";

describe("MetadataTags.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const defaultProps = {
      modelValue: ["tag1", "tag2"],
      editable: false,
    };

    const wrapper = mount(MetadataTags, {
      props: { ...defaultProps, ...props },
    });

    return { wrapper };
  };

  it("should render TagList when not editable", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(TagList).exists()).toBe(true);
  });

  it("should render placeholder when no tags exist", () => {
    const { wrapper } = doMount({ props: { modelValue: [] } });

    expect(wrapper.findComponent(TagList).exists()).toBe(false);
    expect(wrapper.text()).toMatch("No tags have been set yet");
  });

  it("should handle editable tags", () => {
    const { wrapper } = doMount({ props: { editable: true } });

    expect(wrapper.findComponent(TagList).exists()).toBe(false);
    const comboBox = wrapper.findComponent(ComboBox);
    expect(comboBox.exists()).toBe(true);
    expect(comboBox.props("possibleValues")).toEqual([
      { id: "tag1", text: "tag1" },
      { id: "tag2", text: "tag2" },
    ]);
    expect(comboBox.props("modelValue")).toEqual(["tag1", "tag2"]);

    comboBox.vm.$emit("update:modelValue", ["tag3"]);
    expect(wrapper.emitted("update:modelValue")?.[0][0]).toEqual(["tag3"]);
  });
});
