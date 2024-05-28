import { describe, beforeEach, it, vi, expect } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import SearchInput from "webapps-common/ui/components/forms/SearchInput.vue";
import { mockVuexStore } from "@/test/utils";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";

import * as spacesStore from "@/store/spaces";
import { APP_ROUTES } from "@/router/appRoutes";

import { SpaceProviderNS } from "@/api/custom-types";

import SpaceCard from "../SpaceCard.vue";
import SpacePageLayout from "../SpacePageLayout.vue";

const routerPush = vi.fn();

describe("SpaceSelectionPage.vue", () => {
  const spaceGroup = createSpaceGroup({
    id: "group1",
    spaces: [
      createSpace({ id: "space1", name: "SPACE 1" }),
      createSpace({ id: "space2", name: "SPACE 2" }),
      createSpace({ id: "space3", name: "SPACE 3" }),
    ],
  });

  const spaceProvider = createSpaceProvider({
    id: "provider1",
    name: "Some hub space",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [spaceGroup],
  });

  const doMount = async () => {
    vi.doMock("vue-router", () => ({
      useRouter: vi.fn(() => ({ push: routerPush })),
      useRoute: vi.fn(() => ({
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: spaceGroup.id,
        },
      })),
    }));

    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    $store.commit("spaces/setSpaceProviders", {
      [spaceProvider.id]: spaceProvider,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const mockRouter = { push: vi.fn() };

    const SpaceSelectionPage = (await import("../SpaceSelectionPage.vue"))
      .default;

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
  });

  it("should render correctly", async () => {
    const { wrapper } = await doMount();

    expect(wrapper.findComponent(SpacePageLayout).props("title")).toBe(
      spaceGroup.name,
    );
    expect(wrapper.findAllComponents(SpaceCard).length).toBe(3);
  });

  it("should render correct breadcrumb", async () => {
    const { wrapper } = await doMount();

    expect(wrapper.findComponent(SpacePageLayout).props("breadcrumbs")).toEqual(
      [
        expect.objectContaining({ text: spaceProvider.name }),
        expect.objectContaining({ text: spaceGroup.name }),
      ],
    );
  });

  it("should filter spaces when search fields is used", async () => {
    const { wrapper } = await doMount();

    wrapper.findComponent(SearchInput).vm.$emit("update:modelValue", "space 2");
    await nextTick();
    expect(wrapper.findAllComponents(SpaceCard).length).toBe(1);
  });

  it("should navigate to space", async () => {
    const { wrapper } = await doMount();

    await wrapper.findAllComponents(SpaceCard).at(0)!.vm.$emit("click");
    expect(routerPush).toHaveBeenCalledWith({
      name: APP_ROUTES.Home.SpaceBrowsingPage,
      params: {
        spaceProviderId: spaceProvider.id,
        groupId: spaceGroup.id,
        spaceId: "space1",
      },
    });
  });
});
