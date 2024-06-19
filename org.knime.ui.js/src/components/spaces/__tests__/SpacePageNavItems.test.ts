import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { deepMocked, mockVuexStore } from "@/test/utils";
import { useRoute } from "vue-router";

import * as spacesStore from "@/store/spaces";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";

import { API } from "@api";
import { SpaceProviderNS } from "@/api/custom-types";
import { NavMenuItem } from "@/components/common/side-nav";
import { APP_ROUTES } from "@/router/appRoutes";
import SpacePageNavItems from "../SpacePageNavItems.vue";

const routerPush = vi.fn();

const mockedAPI = deepMocked(API);

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: routerPush })),
  useRoute: vi.fn(() => {}),
}));

describe("SpacePageNavItems.vue", () => {
  const createGroup = (idPrefix: string) =>
    createSpaceGroup({
      id: `${idPrefix}-group`,
      spaces: [
        createSpace({ id: `${idPrefix}-group--space1`, name: "SPACE 1" }),
        createSpace({ id: `${idPrefix}-group--space2`, name: "SPACE 2" }),
      ],
    });

  const localProvider = createSpaceProvider({
    spaceGroups: [
      createSpaceGroup({ id: "local", spaces: [createSpace({ id: "local" })] }),
    ],
  });

  const spaceGroup1 = createGroup("provider1");
  const hubProvider1 = createSpaceProvider({
    id: "provider1",
    name: "Some hub space",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [spaceGroup1],
  });

  const spaceGroup2 = createGroup("provider2");
  const hubProvider2 = createSpaceProvider({
    id: "provider2",
    name: "Some hub space",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: Object.create([]),
    connected: false,
  });

  const doMount = () => {
    // @ts-ignore
    useRoute.mockImplementation(() => ({
      params: {
        spaceProviderId: hubProvider1.id,
        groupId: spaceGroup1.id,
        spaceId: spaceGroup1.spaces.at(0)!.id,
      },
    }));

    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");

    $store.commit("spaces/setSpaceProviders", {
      [localProvider.id]: localProvider,
      [hubProvider1.id]: hubProvider1,
      [hubProvider2.id]: hubProvider2,
    });

    const wrapper = mount(SpacePageNavItems, {
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store, dispatchSpy };
  };

  it("should render items", () => {
    const { wrapper } = doMount();

    expect(wrapper.findAllComponents(NavMenuItem).length).toBe(4);

    const firstItem = wrapper.findAllComponents(NavMenuItem).at(0)!.props();
    const secondItem = wrapper.findAllComponents(NavMenuItem).at(1)!.props();
    const thirdItem = wrapper.findAllComponents(NavMenuItem).at(2)!.props();
    const fourthItem = wrapper.findAllComponents(NavMenuItem).at(3)!.props();

    expect(firstItem).toEqual(
      expect.objectContaining({
        text: localProvider.name,
        active: false,
        highlighted: false,
        withIndicator: false,
      }),
    );

    expect(secondItem).toEqual(
      expect.objectContaining({
        text: hubProvider1.name,
        active: true,
        highlighted: false,
        withIndicator: true,
      }),
    );

    expect(thirdItem).toEqual(
      expect.objectContaining({
        text: spaceGroup1.name,
        active: true,
        highlighted: true,
        withIndicator: false,
      }),
    );

    expect(fourthItem).toEqual(
      expect.objectContaining({
        text: hubProvider2.name,
        active: false,
        highlighted: false,
        withIndicator: false,
      }),
    );
  });

  describe("item", () => {
    it("should navigate to local space when clicking", () => {
      const { wrapper } = doMount();
      wrapper.findAllComponents(NavMenuItem).at(0)?.vm.$emit("click");

      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        params: {
          spaceProviderId: "local",
          groupId: "local",
          spaceId: "local",
          itemId: "root",
        },
      });
    });

    it("should connect to provider and then navigate", async () => {
      mockedAPI.desktop.connectSpaceProvider.mockResolvedValueOnce({
        ...hubProvider2,
        spaceGroups: [spaceGroup2],
      });

      const { wrapper, dispatchSpy } = doMount();

      wrapper.findAllComponents(NavMenuItem).at(3)?.vm.$emit("click");
      await flushPromises();

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
        spaceProviderId: hubProvider2.id,
      });

      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.SpaceSelectionPage,
        params: {
          spaceProviderId: hubProvider2.id,
          groupId: "all",
        },
      });
    });
  });
});
