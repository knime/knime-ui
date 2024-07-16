import { expect, describe, it } from "vitest";
import { shallowMount, mount } from "@vue/test-utils";
import { Tag } from "@knime/components";
import SelectableTagList, {
  defaultInitialTagCount,
} from "../SelectableTagList.vue";

const sevenTags = [
  "tag:1",
  "tag:2",
  "tag:3",
  "tag:4",
  "tag:5",
  "tag:6",
  "tag:7",
];
const threeTags = ["tag:1", "tag:2", "tag:3"];

const checkTagTexts = (wrappers, expectedTags, numInitialTags) => {
  if (expectedTags.length > numInitialTags) {
    // initial plus expander tag
    expect(wrappers.length).toEqual(numInitialTags + 1);
    let i = 0;
    while (i < wrappers.length - 1) {
      expect(wrappers.at(i).text()).toEqual(expectedTags[i]);
      i++;
    }
    // last wrapper is expander tag
    expect(wrappers.at(i).text()).toBe(
      `+${expectedTags.length - numInitialTags}`,
    );
  } else {
    expect(wrappers.length).toEqual(expectedTags.length);
    let i = 0;
    while (i < wrappers.length) {
      expect(wrappers.at(i).text()).toEqual(expectedTags[i]);
      i++;
    }
  }
};

describe("SelectableTagList.vue", () => {
  it("renders with empty tags", () => {
    const wrapper = shallowMount(SelectableTagList);
    expect(wrapper.findComponent(Tag).exists()).toBe(false);
  });

  it("renders three tags", () => {
    const wrapper = shallowMount(SelectableTagList, {
      props: { tags: threeTags },
    });

    let tagWrappers = wrapper.findAllComponents(Tag);
    checkTagTexts(tagWrappers, threeTags, defaultInitialTagCount);
  });

  describe("collapsed list", () => {
    it("does not render more than max number of tags", () => {
      const wrapper = shallowMount(SelectableTagList, {
        props: { tags: sevenTags },
      });

      let tagWrappers = wrapper.findAllComponents(Tag);
      checkTagTexts(tagWrappers, sevenTags, defaultInitialTagCount);
    });

    it("honors max number of tags configurable", () => {
      const wrapper = shallowMount(SelectableTagList, {
        props: { tags: sevenTags, numberOfInitialTags: 2 },
      });

      let tagWrappers = wrapper.findAllComponents(Tag);
      checkTagTexts(tagWrappers, sevenTags, 2);
    });

    it("shows number of tags on expand button", () => {
      const wrapper = shallowMount(SelectableTagList, {
        props: {
          tags: sevenTags,
          modelValue: threeTags,
        },
      });

      expect(wrapper.find(".more-tags").text()).toBe("+2");
    });
  });

  describe("expands list", () => {
    it("emits show-more", async () => {
      const wrapper = mount(SelectableTagList, {
        props: { tags: sevenTags },
      });

      // last tag is expander button
      await wrapper.find(".more-tags").trigger("click");
      expect(wrapper.emitted("showMore")).toBeTruthy();
    });

    it("displays all on show-all prop change", async () => {
      const wrapper = shallowMount(SelectableTagList, {
        props: { tags: sevenTags },
      });

      expect(wrapper.findAllComponents(Tag).length).toBe(
        defaultInitialTagCount + 1,
      ); // one is + sign

      await wrapper.setProps({ showAll: true });
      expect(wrapper.findAllComponents(Tag).length).toBe(sevenTags.length);
    });
  });

  describe("selection of tags", () => {
    it("shows number of selected tags separately", () => {
      const wrapper = shallowMount(SelectableTagList, {
        props: {
          tags: sevenTags,
          modelValue: sevenTags,
        },
      });

      expect(wrapper.find(".more-tags").text()).toBe("+2/2");
    });

    it("de-selects selected tag", async () => {
      const wrapper = mount(SelectableTagList, {
        props: {
          tags: sevenTags,
          modelValue: ["tag:1", "tag:2", "tag:3"],
        },
      });
      let tagWrappers = wrapper.findAllComponents(Tag);

      // click selected tag
      await tagWrappers.at(0).trigger("click"); // tag1
      expect(wrapper.emitted("update:modelValue")[0][0]).toStrictEqual([
        "tag:2",
        "tag:3",
      ]);
    });

    it("selects unselected tag on click", async () => {
      const wrapper = mount(SelectableTagList, {
        props: {
          tags: sevenTags,
          modelValue: ["tag:1"],
        },
      });
      let tagWrappers = wrapper.findAllComponents(Tag);

      // click un-selected tag
      await tagWrappers.at(1).trigger("click");
      expect(wrapper.emitted("update:modelValue")[0][0]).toStrictEqual([
        "tag:1",
        "tag:2",
      ]);
    });
  });
});
