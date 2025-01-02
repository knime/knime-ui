import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";

import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import { mockStores } from "@/test/utils/mockStores";
import SidebarSpaceExplorer from "../SidebarSpaceExplorer.vue";

describe("SidebarSpaceExplorer.vue", () => {
  const doMount = ({ activeProjectId = "proj1" } = {}) => {
    const {
      testingPinia,
      applicationStore,
      spacesStore,
      spaceOperationsStore,
    } = mockStores();

    applicationStore.setActiveProjectId(activeProjectId);

    const wrapper = shallowMount(SidebarSpaceExplorer, {
      global: {
        plugins: [testingPinia],
      },
    });

    return {
      wrapper,
      spacesStore,
      spaceOperationsStore,
    };
  };

  it("passes the active project to the SpaceExplorer", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(SpaceExplorer).props().projectId).toBe(
      "proj1",
    );
  });

  it("should handle `currentSelectedItemIds`", async () => {
    const { wrapper, spaceOperationsStore } = doMount();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual([]);

    spaceOperationsStore.setCurrentSelectedItemIds(["1"]);
    await nextTick();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual(["1"]);

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("update:selectedItemIds", ["2"]);

    await nextTick();
    expect(spaceOperationsStore.currentSelectedItemIds).toEqual(["2"]);

    wrapper.unmount();
    expect(spaceOperationsStore.currentSelectedItemIds).toEqual([]);
  });

  it("handle change of directory", async () => {
    const { wrapper, spaceOperationsStore } = doMount();

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("changeDirectory", ["item33"]);
    await nextTick();

    expect(spaceOperationsStore.changeDirectory).toHaveBeenCalledWith({
      pathId: ["item33"],
      projectId: "proj1",
    });
  });
});
