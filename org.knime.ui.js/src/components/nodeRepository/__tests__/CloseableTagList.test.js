import { expect, describe, it } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";

import SelectableTagList from "@/components/common/SelectableTagList.vue";
import CloseableTagList from "../CloseableTagList.vue";

const minNumberOfInitialTags = 1;

const sevenTags = [
  "tag1",
  "tag2",
  "tagedyTag",
  "tagMaster",
  "bestTagEver",
  "moarTags",
  "blub",
];
const threeTags = ["sel1", "nice", "car"];

describe("CloseableTagList.vue", () => {
  const doShallowMount = (props) =>
    shallowMount(CloseableTagList, {
      props,
    });

  it("renders with empty tags", () => {
    const wrapper = doShallowMount();
    expect(wrapper.findComponent(SelectableTagList).exists()).toBe(true);
  });

  it("renders three tags", () => {
    const wrapper = doShallowMount({
      tags: sevenTags,
      modelValue: threeTags,
    });
    expect(wrapper.findComponent(SelectableTagList).props("tags")).toEqual(
      sevenTags,
    );
    expect(
      wrapper.findComponent(SelectableTagList).props("modelValue"),
    ).toEqual(threeTags);
  });

  it("@show-more event leads to displayAll update", async () => {
    const wrapper = doShallowMount({
      tags: sevenTags,
      modelValue: threeTags,
    });
    expect(wrapper.findComponent(SelectableTagList).props("showAll")).toBe(
      false,
    );
    expect(wrapper.vm.displayAll).toBe(false);
    wrapper.findComponent(SelectableTagList).vm.$emit("show-more", true);
    await Vue.nextTick();
    expect(wrapper.vm.displayAll).toBe(true);
    expect(wrapper.findComponent(SelectableTagList).props("showAll")).toBe(
      true,
    );
  });

  it("shows close button if displayAll is set", async () => {
    const wrapper = doShallowMount({
      tags: sevenTags,
      modelValue: threeTags,
    });
    await wrapper.findComponent(SelectableTagList).vm.$emit("show-more");
    let btn = wrapper.find(".tags-popout-close");
    expect(btn.exists()).toBe(true);
    expect(wrapper.findComponent(SelectableTagList).props("showAll")).toBe(
      true,
    );
  });

  describe("dynamic number of initial tags", () => {
    it("calculates the number of shown tags", () => {
      const wrapper = doShallowMount({
        tags: [
          "medium sized",
          "tags that are",
          "shown until the",
          "space is gone",
          "but",
          "many",
          "tags",
        ],
        modelValue: ["some selected ", "medium sized tags", "should be shown"],
      });
      expect(
        wrapper.findComponent(SelectableTagList).props("numberOfInitialTags"),
      ).toBe(2);
    });

    it("limits the number of initial tags to the maximum even if space is left", () => {
      const wrapper = doShallowMount({
        tags: [
          "we",
          "are",
          "really",
          "short",
          "but",
          "many",
          "tags",
          "bigger",
          "then",
          "10",
        ],
        modelValue: ["some", "short", "tags"],
      });
      expect(
        wrapper.findComponent(SelectableTagList).props("numberOfInitialTags"),
      ).toBe(7);
    });

    it("shows a minimum of 2 tags even if they would not fit", () => {
      const wrapper = doShallowMount({
        tags: [
          "the longest tag you would imagine, but way looooooooooooooooooooooooooooooooooooooooooger" +
            " and it is even longer then that",
        ],
        modelValue: [],
      });
      expect(
        wrapper.findComponent(SelectableTagList).props("numberOfInitialTags"),
      ).toBe(minNumberOfInitialTags);
    });
  });

  describe("hide more tags", () => {
    it("hides more on close button click ", async () => {
      const wrapper = doShallowMount({
        tags: sevenTags,
        modelValue: threeTags,
      });

      await wrapper.findComponent(SelectableTagList).vm.$emit("show-more");
      let btn = wrapper.find(".tags-popout-close");
      expect(wrapper.vm.displayAll).toBe(true);
      expect(btn.exists()).toBe(true);

      await btn.trigger("click");
      expect(wrapper.vm.displayAll).toBe(false);
      expect(wrapper.find(".tags-popout-close").exists()).toBe(false);
      expect(wrapper.findComponent(SelectableTagList).props("showAll")).toBe(
        false,
      );
    });

    it("hides more tags on click", async () => {
      const wrapper = doShallowMount({
        tags: sevenTags,
        modelValue: threeTags,
      });

      wrapper.findComponent({ ref: "tagList" }).vm.$emit("show-more");
      await Vue.nextTick();
      expect(wrapper.find(".tags-popout-close").exists()).toBe(true);

      wrapper.findComponent({ ref: "tagList" }).vm.$emit("update:modelValue");
      await Vue.nextTick();
      expect(wrapper.find(".tags-popout-close").exists()).toBe(false);
    });
  });
});
