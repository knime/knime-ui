import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { mockVuexStore } from "@/test/utils";

import * as spacesStore from "@/store/spaces";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { SpaceProviderNS } from "@/api/custom-types";
import { NavMenuItem } from "@/components/common/side-nav";

describe("SpacePageNavItems.vue", () => {
  const spaceGroup = createSpaceGroup({
    id: "group1",
    spaces: [
      createSpace({ id: "space1", name: "SPACE 1" }),
      createSpace({ id: "space2", name: "SPACE 2" }),
    ],
  });

  const spaceProvider1 = createSpaceProvider();
  const spaceProvider2 = createSpaceProvider({
    id: "provider1",
    name: "Some hub space",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [spaceGroup],
  });

  const doMount = async () => {
    vi.doMock("vue-router", () => ({
      useRouter: vi.fn(() => ({ push: () => {} })),
      useRoute: vi.fn(() => ({
        params: {
          spaceProviderId: spaceProvider2.id,
          groupId: spaceGroup.id,
          spaceId: spaceGroup.spaces.at(0)!.id,
        },
      })),
    }));

    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    $store.commit("spaces/setSpaceProviders", {
      [spaceProvider1.id]: spaceProvider1,
      [spaceProvider2.id]: spaceProvider2,
    });

    const SpacePageNavItems = (await import("../SpacePageNavItems.vue"))
      .default;

    const wrapper = mount(SpacePageNavItems, {
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store };
  };

  it("should render items", async () => {
    const { wrapper } = await doMount();

    expect(wrapper.findAllComponents(NavMenuItem).length).toBe(3);

    const firstItem = wrapper.findAllComponents(NavMenuItem).at(0)!.props();

    const secondItem = wrapper.findAllComponents(NavMenuItem).at(1)!.props();

    const thirdItem = wrapper.findAllComponents(NavMenuItem).at(2)!.props();

    expect(firstItem).toEqual(
      expect.objectContaining({
        text: spaceProvider1.name,
        active: false,
        highlighted: false,
        withIndicator: false,
      }),
    );

    expect(secondItem).toEqual(
      expect.objectContaining({
        text: spaceProvider2.name,
        active: true,
        highlighted: false,
        withIndicator: true,
      }),
    );

    expect(thirdItem).toEqual(
      expect.objectContaining({
        text: spaceGroup.name,
        active: true,
        highlighted: true,
        withIndicator: false,
      }),
    );
  });
});
