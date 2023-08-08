import { expect, describe, it } from "vitest";
import { shallowMount } from "@vue/test-utils";
import { mockVuexStore } from "@/test/utils/mockVuexStore";

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
    });

    const wrapper = shallowMount(SidebarSpaceExplorer, {
      global: {
        plugins: [$store],
      },
    });

    return {
      wrapper,
    };
  };

  it("passes the active project to the SpaceExplorer", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(SpaceExplorer).props().projectId).toBe(
      "proj1",
    );
  });
});
