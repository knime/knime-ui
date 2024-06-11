import { describe, expect, it } from "vitest";
import { mockVuexStore } from "@/test/utils";
import { mount } from "@vue/test-utils";
import HelpMenu from "../HelpMenu.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";

const doMount = (customHelpMenuEntries = {}) => {
  const storeConfig = {
    application: {
      state: {
        customHelpMenuEntries,
      },
    },
  };

  const $store = mockVuexStore(storeConfig);
  return mount(HelpMenu, { global: { plugins: [$store] } });
};

const numberOfDefaultHelpMenuEntries = 7;

describe("HelpMenu.vue", () => {
  it("doesn't show custom help menu entries if non present in the application store", () => {
    const wrapper = doMount();
    const props = wrapper.findComponent(SubMenu).props();
    expect(props.items).toHaveLength(numberOfDefaultHelpMenuEntries);
  });

  it("shows custom help menu entries if they are present in the application store", () => {
    const wrapper = doMount({ foo: "link1", bar: "link2" });
    const props = wrapper.findComponent(SubMenu).props();
    expect(props.items).toHaveLength(numberOfDefaultHelpMenuEntries + 2);
  });
});
