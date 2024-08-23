import { describe, expect, it } from "vitest";
import { mockVuexStore } from "@/test/utils";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import * as settings from "@/store/settings";
import HelpMenu from "../HelpMenu.vue";

const doMount = (customHelpMenuEntries = {}) => {
  const storeConfig = {
    application: {
      state: {
        customHelpMenuEntries,
        exampleProjects: [],
      },
    },
    settings,
  };

  const $store = mockVuexStore(storeConfig);
  const wrapper = mount(HelpMenu, { global: { plugins: [$store] } });
  return { wrapper, $store };
};

const numberOfDefaultHelpMenuEntries = 8;

describe("HelpMenu.vue", () => {
  it("doesn't show custom help menu entries if non present in the application store", () => {
    const { wrapper } = doMount();
    const props = wrapper.findComponent(SubMenu).props();
    expect(props.items).toHaveLength(numberOfDefaultHelpMenuEntries);
  });

  it("shows custom help menu entries if they are present in the application store", () => {
    const { wrapper } = doMount({ foo: "link1", bar: "link2" });
    const props = wrapper.findComponent(SubMenu).props();
    expect(props.items).toHaveLength(numberOfDefaultHelpMenuEntries + 2);
  });

  it("should show entry to bring back examples", async () => {
    const { wrapper, $store } = doMount();

    const entryItemText = "Restore examples on home tab";

    const hasEntry = () =>
      wrapper
        .findComponent(SubMenu)
        .props("items")
        .some((item) => item.text === entryItemText);

    expect($store.state.application.exampleProjects.length).toBe(0);
    expect(hasEntry()).toBe(false);

    // adding some projects
    $store.state.application.exampleProjects = [{ name: "Example 1" }];
    await nextTick();

    // still false because the examples are not dismissed
    expect(hasEntry()).toBe(false);

    // dismiss examples
    await $store.dispatch("settings/updateSetting", {
      key: "shouldShowExampleWorkflows",
      value: false,
    });

    expect(hasEntry()).toBe(true);

    // remove projects
    $store.state.application.exampleProjects = [];
    await nextTick();

    expect(hasEntry()).toBe(false);
  });
});
