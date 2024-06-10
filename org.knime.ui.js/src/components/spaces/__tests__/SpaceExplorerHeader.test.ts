import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import { mockVuexStore } from "@/test/utils";

import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import SaveIcon from "webapps-common/ui/assets/img/icons/check.svg";

import * as spacesStore from "@/store/spaces";

import SpaceExplorerHeader from "../SpaceExplorerHeader.vue";

describe("SpaceExplorerHeader.vue", () => {
  const title = "title test";
  const doMount = (isEditable: boolean) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    const wrapper = mount(SpaceExplorerHeader, {
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

    expect(wrapper.find("textarea").text()).toBe(title);
  });

  it("should render an non editable title", () => {
    const { wrapper } = doMount(false);

    expect(wrapper.find(".title").text()).toBe(title);
  });

  it("should render correct breadcrumb", () => {
    const { wrapper } = doMount(true);

    expect(wrapper.findComponent(Breadcrumb).props("items")).toEqual([
      expect.objectContaining({ text: "item 1" }),
      expect.objectContaining({ text: "item 2" }),
    ]);
  });

  it("should submit on click", async () => {
    const { wrapper } = doMount(true);

    wrapper.find("textarea").setValue("new name");
    await wrapper.findAllComponents(FunctionButton).at(0)!.vm.$emit("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("submit")![1]).toEqual(["new name"]);
  });
});
