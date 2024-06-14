import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";

import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";

import * as spacesStore from "@/store/spaces";

import SpacePageHeader from "../SpacePageHeader.vue";

describe("SpacePageHeader.vue", () => {
  const title = "title test";
  const doMount = (isEditable: boolean) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    const wrapper = mount(SpacePageHeader, {
      props: {
        title,
        breadcrumbs: [{ text: "item 1" }, { text: "item 2" }],
        isEditable,
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
});
