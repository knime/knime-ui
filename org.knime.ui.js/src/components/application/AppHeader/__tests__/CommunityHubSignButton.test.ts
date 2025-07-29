import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import AppHeaderButton from "@/components/application/AppHeader/AppHeaderButton.vue";
import { APP_ROUTES } from "@/router/appRoutes";
import { mockStores } from "@/test/utils/mockStores";
import CommunityHubSignButton from "../CommunityHubSignButton.vue";

const routerPush = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useRouter: vi.fn(() => ({ push: routerPush })),
    useRoute: vi.fn(() => ({ name: APP_ROUTES.WorkflowPage, params: {} })),
  };
});

const communityHubProvider = {
  id: "community-hub",
  spaceGroups: [{ id: "hub-id", name: "hub-user" }],
};

describe("CommunityHubSignButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({
    getCommunityHubInfo = {
      communityHubProvider,
      isOnlyCommunityHubMounted: true,
      isCommunityHubConnected: false,
    },
  } = {}) => {
    const mockedStores = mockStores();

    // @ts-expect-error
    mockedStores.spaceProvidersStore.getCommunityHubInfo = getCommunityHubInfo;

    const wrapper = mount(CommunityHubSignButton, {
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    return {
      wrapper,
      mockedStores,
    };
  };

  it("shows Sign in button if only Community Hub is mounted and user is not logged in", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(AppHeaderButton).exists()).toBe(true);
    expect(wrapper.findComponent(AppHeaderButton).text()).toMatch("Sign in");
  });

  it("shows submenu with username if user is logged in", () => {
    const { wrapper } = doMount({
      getCommunityHubInfo: {
        communityHubProvider,
        isOnlyCommunityHubMounted: true,
        isCommunityHubConnected: true,
      },
    });

    expect(wrapper.findComponent(AppHeaderButton).exists()).toBe(true);
    expect(wrapper.findComponent(AppHeaderButton).text()).toMatch(
      communityHubProvider.spaceGroups[0].name,
    );
  });
});
