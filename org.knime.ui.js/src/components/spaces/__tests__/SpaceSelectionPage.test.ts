import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useRoute } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import { NetworkException } from "@/api/gateway-api/generated-exceptions";
import SearchButton from "@/components/common/SearchButton.vue";
import { APP_ROUTES } from "@/router/appRoutes";
import { getToastPresets } from "@/services/toastPresets";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import SpaceCard from "../SpaceCard.vue";
import SpaceExplorerFloatingButton from "../SpaceExplorerFloatingButton.vue";
import SpacePageHeader from "../SpacePageHeader.vue";
import SpaceSelectionPage from "../SpaceSelectionPage.vue";

const routerPush = vi.fn();

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: vi.fn(() => ({ push: routerPush })),
  useRoute: vi.fn(),
}));

vi.mock("@/api/gateway-api/exceptions");

describe("SpaceSelectionPage.vue", () => {
  const spaceGroup1 = createSpaceGroup({
    id: "group1",
    spaces: [
      createSpace({ id: "space1", name: "SPACE 1" }),
      createSpace({ id: "space2", name: "SPACE 2" }),
      createSpace({ id: "space3", name: "SPACE 3" }),
    ],
  });
  const spaceGroup2 = createSpaceGroup({
    id: "group2",
    spaces: [
      createSpace({ id: "space4", name: "SPACE 4" }),
      createSpace({ id: "space5", name: "SPACE 5" }),
      createSpace({ id: "space6", name: "SPACE 6" }),
    ],
  });

  const spaceProvider = createSpaceProvider({
    id: "provider1",
    name: "Some hub space",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [spaceGroup1, spaceGroup2],
  });

  const spaceProvider2 = createSpaceProvider({
    id: "provider2",
    name: "Some hub space",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [],
  });

  const doMount = () => {
    const mockedStores = mockStores();

    const { toastPresets } = getToastPresets();

    mockedStores.spaceProvidersStore.setSpaceProviders({
      [spaceProvider.id]: spaceProvider,
      [spaceProvider2.id]: spaceProvider2,
    });

    const mockRouter = { push: vi.fn() };

    const wrapper = mount(SpaceSelectionPage, {
      global: {
        plugins: [mockedStores.testingPinia],
        stubs: { RouterLink: true },
      },
    });

    return {
      wrapper,
      mockedStores,
      $router: mockRouter,
      toastPresets,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("for page with known space group", () => {
    beforeEach(() => {
      // @ts-expect-error
      useRoute.mockImplementation(() => ({
        name: APP_ROUTES.Home.SpaceSelectionPage,
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: spaceGroup1.id,
        },
      }));
    });

    it("should reload spaces", async () => {
      const { wrapper, mockedStores, toastPresets } = doMount();

      const reloadProviderSpacesFailedSpy = vi.spyOn(
        toastPresets.spaces.crud,
        "reloadProviderSpacesFailed",
      );

      vi.mocked(
        mockedStores.spaceProvidersStore.reloadProviderSpaces,
      ).mockResolvedValueOnce();

      await wrapper.find(".reload-button").trigger("click");

      await flushPromises();

      expect(
        mockedStores.spaceProvidersStore.reloadProviderSpaces,
      ).toHaveBeenCalledWith({
        id: spaceProvider.id,
      });

      expect(reloadProviderSpacesFailedSpy).not.toHaveBeenCalled();
    });

    it("should show error when reloading spaces", async () => {
      const { wrapper, mockedStores, toastPresets } = doMount();

      const reloadProviderSpacesFailedSpy = vi.spyOn(
        toastPresets.spaces.crud,
        "reloadProviderSpacesFailed",
      );

      vi.mocked(
        mockedStores.spaceProvidersStore.reloadProviderSpaces,
      ).mockImplementationOnce(() =>
        Promise.reject(new NetworkException({ message: "Connectivity issue" })),
      );

      await wrapper.find(".reload-button").trigger("click");

      expect(
        mockedStores.spaceProvidersStore.reloadProviderSpaces,
      ).toHaveBeenCalledWith({
        id: spaceProvider.id,
      });

      expect(reloadProviderSpacesFailedSpy).toHaveBeenCalled();
    });

    it("should render correctly", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(SpacePageHeader).props("title")).toBe(
        spaceGroup1.name,
      );
      expect(wrapper.findAllComponents(SpaceCard).length).toBe(3);
    });

    it("should render correct breadcrumb", () => {
      const { wrapper } = doMount();

      expect(
        wrapper.findComponent(SpacePageHeader).props("breadcrumbs"),
      ).toEqual([
        expect.objectContaining({ text: spaceProvider.name }),
        expect.objectContaining({ text: spaceGroup1.name }),
      ]);
    });

    it("should filter spaces when search fields is used", async () => {
      const { wrapper } = doMount();

      wrapper
        .findComponent(SearchButton)
        .vm.$emit("update:modelValue", "space 2");
      await nextTick();
      expect(wrapper.findAllComponents(SpaceCard).length).toBe(1);
    });

    it("should navigate to space", async () => {
      const { wrapper } = doMount();

      await wrapper.findAllComponents(SpaceCard).at(0)!.vm.$emit("click");
      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: spaceGroup1.id,
          spaceId: "space1",
          itemId: "root",
        },
      });
    });

    it("should create a new space", async () => {
      const { wrapper, mockedStores } = doMount();

      await wrapper
        .findAllComponents(SpaceExplorerFloatingButton)
        .at(0)!
        .vm.$emit("click");
      expect(
        mockedStores.spaceOperationsStore.createSpace,
      ).toHaveBeenCalledWith({
        spaceProviderId: spaceProvider.id,
        spaceGroup: spaceGroup1,
        $router: expect.anything(),
      });
    });
  });

  describe("for page with all space groups", () => {
    beforeEach(() => {
      // @ts-expect-error
      useRoute.mockImplementation(() => ({
        name: APP_ROUTES.Home.SpaceSelectionPage,
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: "all",
        },
      }));
    });

    it("should render correctly", () => {
      const { wrapper } = doMount();

      expect(wrapper.findComponent(SpacePageHeader).props("title")).toBe(
        `Spaces of ${spaceProvider.name}`,
      );
      expect(wrapper.findAllComponents(SpaceCard).length).toBe(6);
    });

    it("should render correct breadcrumb", () => {
      const { wrapper } = doMount();

      expect(
        wrapper.findComponent(SpacePageHeader).props("breadcrumbs"),
      ).toEqual([expect.objectContaining({ text: spaceProvider.name })]);
    });

    it("should filter spaces when search fields is used", async () => {
      const { wrapper } = doMount();

      wrapper
        .findComponent(SearchButton)
        .vm.$emit("update:modelValue", "space 6");
      await nextTick();
      expect(wrapper.findAllComponents(SpaceCard).length).toBe(1);
    });

    it("should navigate to space", async () => {
      const { wrapper } = doMount();

      await wrapper.findAllComponents(SpaceCard).at(-1)!.vm.$emit("click");
      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: spaceGroup2.id,
          spaceId: "space6",
          itemId: "root",
        },
      });
    });
  });

  it("for page with no space groups it should show a message", () => {
    // @ts-expect-error
    useRoute.mockImplementation(() => ({
      name: APP_ROUTES.Home.SpaceSelectionPage,
      params: {
        spaceProviderId: spaceProvider2.id,
      },
    }));

    const { wrapper } = doMount();

    expect(wrapper.find(".no-space-groups").text()).toBe(
      "You are not a member of any team, yet. To get started ask an admin to assign you to a team.",
    );
  });
});
