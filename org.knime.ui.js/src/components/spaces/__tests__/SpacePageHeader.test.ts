import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { Breadcrumb, FunctionButton } from "@knime/components";

import * as spacesStore from "@/store/spaces";
import { mockVuexStore } from "@/test/utils";
import SpacePageHeader from "../SpacePageHeader.vue";

describe("SpacePageHeader.vue", () => {
  const title = "title test";
  const doMount = (isEditable: boolean, isEditing: boolean = false) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    const wrapper = mount(SpacePageHeader, {
      props: {
        title,
        breadcrumbs: [{ text: "item 1" }, { text: "item 2" }],
        isEditable,
        isEditing,
      },
    });

    return { wrapper, $store };
  };

  it("should render an editable title", () => {
    const { wrapper } = doMount(true);

    expect(wrapper.find("textarea").element.value).toBe(title);
  });

  it("should render an non editable title", () => {
    const { wrapper } = doMount(false);

    expect(wrapper.find("h2").find("span").text()).toBe(title);
  });

  it("should render correct breadcrumb", () => {
    const { wrapper } = doMount(true);

    expect(wrapper.findComponent(Breadcrumb).props("items")).toEqual([
      expect.objectContaining({ text: "item 1" }),
      expect.objectContaining({ text: "item 2" }),
    ]);
  });

  it("should submit on click", () => {
    const { wrapper } = doMount(true);
    const textArea = wrapper.find("textarea");

    textArea.element.value = "new name";
    textArea.trigger("input");
    wrapper.findAllComponents(FunctionButton).at(0)!.vm.$emit("click");

    expect(wrapper.emitted("submit")![0]).toEqual(["new name"]);
  });

  it("should NOT submit when name hasn't changed", () => {
    const { wrapper } = doMount(true);
    const textArea = wrapper.find("textarea");

    textArea.element.value = title;
    textArea.trigger("input");
    wrapper.findAllComponents(FunctionButton).at(0)!.vm.$emit("click");

    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("should only submit changed values (after trimming)", async () => {
    const title = "some mock test name";

    const { wrapper } = doMount(true);
    await wrapper.setProps({ title });

    const textArea = wrapper.find("textarea");

    textArea.element.value = title;
    textArea.trigger("input");
    wrapper.findAllComponents(FunctionButton).at(0)!.vm.$emit("click");
    expect(wrapper.emitted("submit")).toBeFalsy();

    textArea.element.value = ` ${title}  `; // check trimming
    textArea.trigger("input");
    wrapper.findAllComponents(FunctionButton).at(0)!.vm.$emit("click");
    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("should emit update:isEditing on focus", async () => {
    const { wrapper } = doMount(true);

    const textArea = wrapper.find("textarea");
    await textArea.trigger("focus");

    expect(wrapper.emitted("update:isEditing")).toBeTruthy();
    expect(wrapper.emitted("update:isEditing")![0]).toEqual([true]);
  });

  it("should reset spaceName, emit update:isEditing and cancel on cancel", async () => {
    const { wrapper } = doMount(true);

    const textArea = wrapper.find("textarea");

    textArea.element.value = "changed name";
    textArea.trigger("input");

    const functionButtons = wrapper.findAllComponents(FunctionButton);
    await functionButtons.at(1)!.trigger("click");
    await nextTick();

    expect(textArea.element.value).toBe(title);
    expect(wrapper.emitted("update:isEditing")![0]).toEqual([false]);
    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("should display error message when error prop is provided", () => {
    const errorMessage = "This is an error";

    const wrapper = mount(SpacePageHeader, {
      props: {
        title,
        breadcrumbs: [{ text: "item 1" }, { text: "item 2" }],
        isEditable: true,
        error: errorMessage,
      },
    });

    const errorSpan = wrapper.find(".msg-error");
    expect(errorSpan.exists()).toBe(true);
    expect(errorSpan.text()).toBe(errorMessage);
  });

  it("should submit on Enter key press", async () => {
    const { wrapper } = doMount(true, true);
    await nextTick();

    const textArea = wrapper.find("textarea");

    textArea.element.value = "new name";
    textArea.trigger("input");

    await textArea.trigger("keydown", { key: "Enter" });
    await nextTick();

    expect(wrapper.emitted("submit")![0]).toEqual(["new name"]);
  });

  it("should cancel on Escape key press", async () => {
    const { wrapper } = doMount(true, true);
    await nextTick();

    const textArea = wrapper.find("textarea");

    textArea.element.value = "Space New Title 1";
    textArea.trigger("input");

    await textArea.trigger("keydown", { key: "Escape" });
    await nextTick();

    expect(wrapper.emitted("cancel")).toBeTruthy();
    expect(textArea.element.value).toBe(title);
  });

  it("should submit on clicking outside the textarea", async () => {
    const { wrapper } = doMount(true, true);
    const textArea = wrapper.find("textarea");

    textArea.element.value = "Space New Title 2";
    textArea.trigger("input");

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(clickEvent);
    await nextTick();

    expect(wrapper.emitted("submit")![0]).toEqual(["Space New Title 2"]);
  });

  it("should not submit if the title has not changed on clicking outside", async () => {
    const { wrapper } = doMount(true, true);
    const textArea = wrapper.find("textarea");

    textArea.element.value = title;
    textArea.trigger("input");

    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    document.body.dispatchEvent(clickEvent);

    await nextTick();

    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("should display and error and not submit if there are validation errors", async () => {
    const { wrapper } = doMount(true, true);
    const textArea = wrapper.find("textarea");

    textArea.element.value = "Invalid name.//%";
    textArea.trigger("input");
    await nextTick();

    expect(wrapper.find(".msg-error").exists()).toBe(true);

    wrapper.findAllComponents(FunctionButton).at(0)!.vm.$emit("click");

    expect(wrapper.emitted("submit")).toBeUndefined();
  });
});
