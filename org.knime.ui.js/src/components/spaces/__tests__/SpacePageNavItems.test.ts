import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { useRoute } from "vue-router";

import { FunctionButton } from "@knime/components";

import { SpaceProviderNS } from "@/api/custom-types";
import { NavMenuItem } from "@/components/common/side-nav";
import { APP_ROUTES } from "@/router/appRoutes";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SpacePageNavItems from "../SpacePageNavItems.vue";

const routerPush = vi.fn();

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
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
    connectionMode: "AUTHENTICATED",
    spaceGroups: [spaceGroup1],
  });

  const serverProvider = createSpaceProvider({
    id: "serverProvider",
    name: "Some server space",
    type: SpaceProviderNS.TypeEnum.SERVER,
    connected: false,
    spaceGroups: [
      createSpaceGroup({
        id: "serverGroup",
        spaces: [createSpace({ id: "serverSpace", name: "SERVER SPACE" })],
      }),
    ],
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

    const mockedStores = mockStores();

    mockedStores.spaceProvidersStore.setSpaceProviders({
      // copy data to not mutate global variables
      [localProvider.id]: { ...localProvider },
      [hubProvider1.id]: { ...hubProvider1 },
      [hubProvider2.id]: { ...hubProvider2 },
      [serverProvider.id]: { ...serverProvider },
    });
    mockedStores.spaceProvidersStore.hasLoadedProviders = true;

    const wrapper = mount(SpacePageNavItems, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  const getMenuItemByDataTestId = (
    wrapper: VueWrapper<any>,
    dataTestId: string,
  ) => {
    return wrapper
      .find(`[data-test-id="${dataTestId}"]`)
      .findComponent(NavMenuItem);
  };

  it("should render items", () => {
    const { wrapper } = doMount();

    expect(wrapper.findAllComponents(NavMenuItem).length).toBe(5);

    const firstItem = getMenuItemByDataTestId(
      wrapper,
      localProvider.id,
    ).props();

    const secondItem = getMenuItemByDataTestId(
      wrapper,
      hubProvider1.id,
    ).props();

    const thirdItem = getMenuItemByDataTestId(wrapper, spaceGroup1.id).props();

    const fourthItem = getMenuItemByDataTestId(
      wrapper,
      hubProvider2.id,
    ).props();

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
      getMenuItemByDataTestId(wrapper, localProvider.id).vm.$emit("click");

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
      const { wrapper, mockedStores } = doMount();

      vi.mocked(
        mockedStores.spaceAuthStore.connectProvider,
      ).mockResolvedValueOnce({
        isConnected: true,
        providerData: {
          ...hubProvider2,
          connected: true,
          spaceGroups: [spaceGroup2],
        },
      });

      getMenuItemByDataTestId(wrapper, hubProvider2.id).vm.$emit("click");
      await flushPromises();

      expect(mockedStores.spaceAuthStore.connectProvider).toHaveBeenCalledWith({
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

    it("should connect to server provider and navigate directly to its space", async () => {
      const { wrapper, mockedStores } = doMount();

      vi.mocked(
        mockedStores.spaceAuthStore.connectProvider,
      ).mockResolvedValueOnce({
        isConnected: true,
        providerData: serverProvider,
      });

      getMenuItemByDataTestId(wrapper, serverProvider.id).vm.$emit("click");
      await flushPromises();

      expect(mockedStores.spaceAuthStore.connectProvider).toHaveBeenCalledWith({
        spaceProviderId: serverProvider.id,
      });

      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        params: {
          spaceProviderId: serverProvider.id,
          groupId: "serverGroup",
          spaceId: "serverSpace",
          itemId: "root",
        },
      });
    });

    describe("logout button", () => {
      it("should show for correct providers", async () => {
        const { wrapper, mockedStores } = doMount();

        const firstItem = getMenuItemByDataTestId(wrapper, localProvider.id);
        const secondItem = getMenuItemByDataTestId(wrapper, hubProvider1.id);
        const thirdItem = getMenuItemByDataTestId(wrapper, spaceGroup1.id);
        const fourthItem = getMenuItemByDataTestId(wrapper, hubProvider2.id);

        expect(firstItem.findComponent(FunctionButton).exists()).toBe(false);
        expect(secondItem.findComponent(FunctionButton).exists()).toBe(true);
        expect(thirdItem.findComponent(FunctionButton).exists()).toBe(false);
        expect(fourthItem.findComponent(FunctionButton).exists()).toBe(false);

        mockedStores.spaceProvidersStore.spaceProviders![
          hubProvider1.id
        ].connected = false;
        await nextTick();
        expect(secondItem.findComponent(FunctionButton).exists()).toBe(false);
      });

      it("should hide logout button when provider data is loading", async () => {
        const { wrapper, mockedStores } = doMount();

        const firstItem = getMenuItemByDataTestId(wrapper, localProvider.id);
        const secondItem = getMenuItemByDataTestId(wrapper, hubProvider1.id);
        const thirdItem = getMenuItemByDataTestId(wrapper, spaceGroup1.id);
        const fourthItem = getMenuItemByDataTestId(wrapper, hubProvider2.id);

        expect(firstItem.findComponent(FunctionButton).exists()).toBe(false);
        expect(secondItem.findComponent(FunctionButton).exists()).toBe(true);
        expect(thirdItem.findComponent(FunctionButton).exists()).toBe(false);
        expect(fourthItem.findComponent(FunctionButton).exists()).toBe(false);

        mockedStores.spaceProvidersStore.loadingProviderSpacesData[
          hubProvider1.id
        ] = true;
        await nextTick();
        expect(secondItem.findComponent(FunctionButton).exists()).toBe(false);
      });
    });

    describe("loading state", () => {
      it("should show when provider data is loading", async () => {
        const { wrapper, mockedStores } = doMount();

        const firstItem = getMenuItemByDataTestId(wrapper, localProvider.id);
        const secondItem = getMenuItemByDataTestId(wrapper, hubProvider1.id);
        const thirdItem = getMenuItemByDataTestId(wrapper, spaceGroup1.id);
        const fourthItem = getMenuItemByDataTestId(wrapper, hubProvider2.id);

        mockedStores.spaceProvidersStore.loadingProviderSpacesData[
          hubProvider1.id
        ] = true;
        await nextTick();

        expect(firstItem.find(".loading-indicator").exists()).toBe(false);
        expect(secondItem.find(".loading-indicator").exists()).toBe(true);
        expect(thirdItem.find(".loading-indicator").exists()).toBe(false);
        expect(fourthItem.find(".loading-indicator").exists()).toBe(false);

        mockedStores.spaceProvidersStore.loadingProviderSpacesData[
          hubProvider1.id
        ] = false;
        await nextTick();

        expect(firstItem.find(".loading-indicator").exists()).toBe(false);
        expect(secondItem.find(".loading-indicator").exists()).toBe(false);
        expect(thirdItem.find(".loading-indicator").exists()).toBe(false);
        expect(fourthItem.find(".loading-indicator").exists()).toBe(false);
      });

      it("should show when provider is connecting", async () => {
        const { wrapper, mockedStores } = doMount();

        const firstItem = getMenuItemByDataTestId(wrapper, localProvider.id);
        const secondItem = getMenuItemByDataTestId(wrapper, hubProvider1.id);
        const thirdItem = getMenuItemByDataTestId(wrapper, spaceGroup1.id);
        const fourthItem = getMenuItemByDataTestId(wrapper, hubProvider2.id);

        mockedStores.spaceProvidersStore.isConnectingToProvider =
          hubProvider1.id;
        await nextTick();

        expect(firstItem.find(".loading-indicator").exists()).toBe(false);
        expect(secondItem.find(".loading-indicator").exists()).toBe(true);
        expect(thirdItem.find(".loading-indicator").exists()).toBe(false);
        expect(fourthItem.find(".loading-indicator").exists()).toBe(false);

        mockedStores.spaceProvidersStore.isConnectingToProvider = null;
        await nextTick();

        expect(firstItem.find(".loading-indicator").exists()).toBe(false);
        expect(secondItem.find(".loading-indicator").exists()).toBe(false);
        expect(thirdItem.find(".loading-indicator").exists()).toBe(false);
        expect(fourthItem.find(".loading-indicator").exists()).toBe(false);
      });
    });
  });
});
