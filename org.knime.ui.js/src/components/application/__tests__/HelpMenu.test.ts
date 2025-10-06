import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { mockStores } from "@/test/utils/mockStores";
import HelpMenu from "../HelpMenu.vue";

const doMount = ({
  customHelpMenuEntries = {},
  getCommunityHubInfo = {
    isOnlyCommunityHubMounted: false,
  },
} = {}) => {
  const mockedStores = mockStores();
  mockedStores.applicationStore.customHelpMenuEntries = customHelpMenuEntries;
  // @ts-expect-error
  mockedStores.spaceProvidersStore.getCommunityHubInfo = getCommunityHubInfo;
  const wrapper = mount(HelpMenu, {
    global: { plugins: [mockedStores.testingPinia] },
  });
  return { wrapper, mockedStores };
};

const numberOfDefaultHelpMenuEntries = 9;

describe("HelpMenu.vue", () => {
  it("doesn't show custom help menu entries if non present in the application store", () => {
    const { wrapper } = doMount();
    const props = wrapper.findComponent(SubMenu).props();
    expect(props.items).toHaveLength(numberOfDefaultHelpMenuEntries);
  });

  it("shows custom help menu entries if they are present in the application store", () => {
    const { wrapper } = doMount({
      customHelpMenuEntries: { foo: "link1", bar: "link2" },
    });
    const props = wrapper.findComponent(SubMenu).props();
    expect(props.items).toHaveLength(numberOfDefaultHelpMenuEntries + 2);
  });

  it("should show info about team plan if only Community Hub is mounted", () => {
    const { wrapper } = doMount({
      getCommunityHubInfo: {
        isOnlyCommunityHubMounted: true,
      },
    });

    const teamPlanItemText = "Learn more about KNIME pricing";

    const hasEntry = () =>
      wrapper
        .findComponent(SubMenu)
        .props("items")
        .some((item) => item.text === teamPlanItemText);

    expect(hasEntry()).toBe(true);
    const props = wrapper.findComponent(SubMenu).props();
    expect(props.items).toHaveLength(numberOfDefaultHelpMenuEntries + 1);
  });

  it("should show entry to bring back examples", async () => {
    const { wrapper, mockedStores } = doMount();

    const entryItemText = "Restore examples on home tab";

    const hasEntry = () =>
      wrapper
        .findComponent(SubMenu)
        .props("items")
        .some((item) => item.text === entryItemText);

    expect(mockedStores.applicationStore.exampleProjects.length).toBe(0);
    expect(hasEntry()).toBe(false);

    // adding some projects
    mockedStores.applicationStore.exampleProjects = [{ name: "Example 1" }];
    await nextTick();

    // still false because the examples are not dismissed
    expect(hasEntry()).toBe(false);

    // dismiss examples
    await mockedStores.settingsStore.updateSetting({
      key: "shouldShowExampleWorkflows",
      value: false,
    });

    expect(hasEntry()).toBe(true);

    // remove projects
    mockedStores.applicationStore.exampleProjects = [];
    await nextTick();

    expect(hasEntry()).toBe(false);
  });
});
