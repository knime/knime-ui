import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { useRoute } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import SearchButton from "@/components/common/SearchButton.vue";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import * as spacesStore from "@/store/spaces";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { mockVuexStore, mockedObject } from "@/test/utils";
import SpaceCard from "../SpaceCard.vue";
import SpaceExplorerFloatingButton from "../SpaceExplorerFloatingButton.vue";
import SpacePageHeader from "../SpacePageHeader.vue";
import SpaceSelectionPage from "../SpaceSelectionPage.vue";

const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: routerPush })),
  useRoute: vi.fn(),
}));

const toast = mockedObject(getToastsProvider());

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

  const doMount = () => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    $store.commit("spaces/setSpaceProviders", {
      [spaceProvider.id]: spaceProvider,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const mockRouter = { push: vi.fn() };

    const wrapper = mount(SpaceSelectionPage, {
      global: {
        plugins: [$store],
        stubs: { RouterLink: true },
      },
    });

    return { wrapper, $store, dispatchSpy, commitSpy, $router: mockRouter };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("for page with known space group", () => {
    beforeEach(() => {
      // @ts-ignore
      useRoute.mockImplementation(() => ({
        name: APP_ROUTES.Home.SpaceSelectionPage,
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: spaceGroup1.id,
        },
      }));
    });

    it("should reload spaces", async () => {
      const { wrapper, dispatchSpy } = doMount();

      await wrapper.find(".reload-button").trigger("click");

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/reloadProviderSpaces", {
        id: spaceProvider.id,
      });

      expect(toast.show).not.toHaveBeenCalled();
    });

    it("should show error when reloading spaces", async () => {
      const { wrapper, dispatchSpy } = doMount();

      dispatchSpy.mockImplementationOnce(() =>
        Promise.reject(new Error("failed")),
      );

      await wrapper.find(".reload-button").trigger("click");

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/reloadProviderSpaces", {
        id: spaceProvider.id,
      });

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "failed",
        }),
      );
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
      const { wrapper, $store } = doMount();

      await wrapper
        .findAllComponents(SpaceExplorerFloatingButton)
        .at(0)!
        .vm.$emit("click");
      expect($store.dispatch).toHaveBeenCalledWith("spaces/createSpace", {
        spaceProviderId: spaceProvider.id,
        spaceGroup: spaceGroup1,
        $router: expect.anything(),
      });
    });
  });

  describe("for page with all space groups", () => {
    beforeEach(() => {
      // @ts-ignore
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
});
