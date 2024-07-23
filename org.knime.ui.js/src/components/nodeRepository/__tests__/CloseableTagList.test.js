import { expect, describe, it } from "vitest";
import * as Vue from "vue";
import { shallowMount } from "@vue/test-utils";

import { TagList } from "@knime/components";
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
    expect(wrapper.findComponent(TagList).exists()).toBe(true);
  });

  it("renders three tags", () => {
    const wrapper = doShallowMount({
      tags: sevenTags,
      modelValue: threeTags,
    });
    expect(wrapper.findComponent(TagList).props("tags")).toEqual(sevenTags);
    expect(wrapper.findComponent(TagList).props("activeTags")).toEqual(
      threeTags,
    );
  });

  describe("click on tag", () => {
    it("adds tag on click to active tags", async () => {
      const wrapper = doShallowMount({
        tags: sevenTags,
        modelValue: ["some"],
      });

      await wrapper.findComponent(TagList).vm.$emit("click", "clicked-tag");

      expect(wrapper.emitted("update:modelValue")[0][0]).toStrictEqual([
        "some",
        "clicked-tag",
      ]);
    });

    it("removes tag on click to active tags", async () => {
      const wrapper = doShallowMount({
        tags: sevenTags,
        modelValue: ["some", "other"],
      });

      await wrapper.findComponent(TagList).vm.$emit("click", "other");

      expect(wrapper.emitted("update:modelValue")[0][0]).toStrictEqual([
        "some",
      ]);
    });
  });

  it("shows close button if showAll is set", async () => {
    const wrapper = doShallowMount({
      tags: sevenTags,
      modelValue: threeTags,
    });
    await wrapper.findComponent(TagList).vm.$emit("update:showAll", true);
    let btn = wrapper.find(".tags-popout-close");
    expect(btn.exists()).toBe(true);
    expect(wrapper.findComponent(TagList).props("showAll")).toBe(true);
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
      expect(wrapper.findComponent(TagList).props("numberOfInitialTags")).toBe(
        2,
      );
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
      expect(wrapper.findComponent(TagList).props("numberOfInitialTags")).toBe(
        7,
      );
    });

    it("shows a minimum of 2 tags even if they would not fit", () => {
      const wrapper = doShallowMount({
        tags: [
          "the longest tag you would imagine, but way looooooooooooooooooooooooooooooooooooooooooger" +
            " and it is even longer then that",
        ],
        modelValue: [],
      });
      expect(wrapper.findComponent(TagList).props("numberOfInitialTags")).toBe(
        minNumberOfInitialTags,
      );
    });
  });

  describe("hide more tags", () => {
    it("hides more on close button click ", async () => {
      const wrapper = doShallowMount({
        tags: sevenTags,
        modelValue: threeTags,
      });

      await wrapper.findComponent(TagList).vm.$emit("update:showAll", true);
      let btn = wrapper.find(".tags-popout-close");
      expect(btn.exists()).toBe(true);

      await btn.trigger("click");
      expect(wrapper.find(".tags-popout-close").exists()).toBe(false);
      expect(wrapper.findComponent(TagList).props("showAll")).toBe(false);
    });

    it("hides more tags on click", async () => {
      const wrapper = doShallowMount({
        tags: sevenTags,
        modelValue: threeTags,
      });

      wrapper.findComponent(TagList).vm.$emit("update:showAll", true);
      await Vue.nextTick();
      expect(wrapper.find(".tags-popout-close").exists()).toBe(true);

      wrapper.findComponent(TagList).vm.$emit("click", "something");
      await Vue.nextTick();
      expect(wrapper.find(".tags-popout-close").exists()).toBe(false);
    });
  });
});
