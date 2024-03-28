import { expect, describe, it } from "vitest";
import { nextTick } from "vue";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";
import * as spacesStore from "@/store/spaces";

import SidebarSpaceExplorer from "../SidebarSpaceExplorer.vue";
import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";

describe("SidebarSpaceExplorer.vue", () => {
  const doMount = ({ activeProjectId = "proj1" } = {}) => {
    const $store = mockVuexStore({
      application: {
        state: {
          activeProjectId,
        },
      },
      spaces: spacesStore,
    });

    const wrapper = shallowMount(SidebarSpaceExplorer, {
      global: {
        plugins: [$store],
      },
    });

    return {
      wrapper,
      $store,
    };
  };

  it("passes the active project to the SpaceExplorer", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(SpaceExplorer).props().projectId).toBe(
      "proj1",
    );
  });

  it("should handle `currentSelectedItemIds`", async () => {
    const { wrapper, $store } = doMount();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual([]);

    $store.commit("spaces/setCurrentSelectedItemIds", ["1"]);
    await nextTick();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual(["1"]);

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("update:selectedItemIds", ["2"]);

    await nextTick();
    expect($store.state.spaces.currentSelectedItemIds).toEqual(["2"]);

    wrapper.unmount();
    expect($store.state.spaces.currentSelectedItemIds).toEqual([]);
  });
});
