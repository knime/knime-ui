import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { MenuItems } from "@knime/components";

import { type RecentWorkflow, SpaceProviderNS } from "@/api/custom-types";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { createSpace, createSpaceProvider } from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import RecentWorkflowContextMenu from "../RecentWorkflowContextMenu.vue";

const routerPush = vi.fn();

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    useRouter: vi.fn(() => ({ push: routerPush })),
    useRoute: vi.fn(() => ({})),
  };
});

const mockedAPI = deepMocked(API);

describe("RecentWorkflowContextMenu.vue", () => {
  const LOCAL_PROVIDER = {
    id: "local",
    spaceId: "local",
  };

  const HUB_PROVIDER = {
    id: "hub-provider",
    space1Id: "space1",
    space2Id: "space2",
  };

  const SERVER_PROVIDER = {
    id: "server-provider",
  };

  const PROVIDERS = {
    [LOCAL_PROVIDER.id]: createSpaceProvider({
      spaceGroups: [
        {
          id: "group1",
          name: "some user group",
          type: SpaceProviderNS.UserTypeEnum.USER,
          spaces: [
            createSpace({
              id: LOCAL_PROVIDER.spaceId,
              name: "Local Space",
              owner: "local",
            }),
          ],
        },
      ],
    }),
    [HUB_PROVIDER.id]: createSpaceProvider({
      id: HUB_PROVIDER.id,
      name: "Hub space",
      type: SpaceProviderNS.TypeEnum.HUB,
      spaceGroups: [
        {
          id: "group1",
          name: "some other user group 1",
          type: SpaceProviderNS.UserTypeEnum.USER,
          spaces: [createSpace({ id: HUB_PROVIDER.space1Id })],
        },
        {
          id: "group2",
          name: "some other user group 2",
          type: SpaceProviderNS.UserTypeEnum.USER,
          spaces: [createSpace({ id: HUB_PROVIDER.space2Id })],
        },
      ],
    }),
    [SERVER_PROVIDER.id]: createSpaceProvider({
      id: SERVER_PROVIDER.id,
      name: "Server space",
      type: SpaceProviderNS.TypeEnum.SERVER,
      spaceGroups: [
        {
          id: "group2",
          name: "some other user group",
          type: SpaceProviderNS.UserTypeEnum.USER,
          spaces: [createSpace()],
        },
      ],
    }),
  };

  const recentWorkflows = {
    localProjectRoot: {
      name: "local-project-root",
      timeUsed: "time",
      origin: {
        ancestorItemIds: [],
        itemId: "1234",
        spaceId: LOCAL_PROVIDER.spaceId,
        providerId: LOCAL_PROVIDER.id,
      },
    },
    localProjectNested: {
      name: "local-project-nested",
      timeUsed: "time",
      origin: {
        itemId: "1234",
        ancestorItemIds: ["1"],
        spaceId: LOCAL_PROVIDER.spaceId,
        providerId: LOCAL_PROVIDER.id,
      },
    },
    localProjectNestedDeep: {
      name: "local-project-nested-deep",
      timeUsed: "time",
      origin: {
        itemId: "1234",
        ancestorItemIds: ["2", "1"],
        spaceId: LOCAL_PROVIDER.spaceId,
        providerId: LOCAL_PROVIDER.id,
      },
    },
    hubProject: {
      name: "hub-project",
      timeUsed: "time",
      origin: {
        itemId: "1234",
        spaceId: HUB_PROVIDER.space1Id,
        providerId: HUB_PROVIDER.id,
      },
    },
    hubProjectNested: {
      name: "hub-project-nested",
      timeUsed: "time",
      origin: {
        itemId: "1234",
        ancestorItemIds: ["1"],
        spaceId: HUB_PROVIDER.space1Id,
        providerId: HUB_PROVIDER.id,
      },
    },
    hubProjectUnknown: {
      name: "hub-project-unknown",
      timeUsed: "time",
      origin: {
        itemId: "1234",
        spaceId: "some unknown space",
        providerId: "some unknown provider",
      },
    },
    serverProject: {
      name: "server-project",
      timeUsed: "time",
      origin: {
        itemId: "1234",
        spaceId: "irrelevant",
        providerId: SERVER_PROVIDER.id,
      },
    },
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultRecentWorkflow = {
    name: "Recent WF",
    timeUsed: "time",
    origin: {
      providerId: LOCAL_PROVIDER.id,
      spaceId: LOCAL_PROVIDER.spaceId,
      itemId: "item1",
    },
  };

  const defaultProps = (recentWorkflow: RecentWorkflow) => ({
    anchor: {
      item: {
        id: "id",
        name: "item-name",
        isOpen: false,
        isDirectory: false,
        isOpenableFile: true,
        canBeRenamed: false,
        canBeDeleted: false,
        meta: {
          recentWorkflow,
        },
      },
      index: 0,
      element: document.createElement("div"),
    },
    onItemClick: () => {},
    closeContextMenu: () => {},
  });

  const doMount = async (
    { recentWorkflow }: { recentWorkflow: RecentWorkflow } = {
      recentWorkflow: defaultRecentWorkflow,
    },
  ) => {
    const mockedStores = mockStores();

    mockedStores.spaceProvidersStore.spaceProviders = PROVIDERS;

    const wrapper = mount(RecentWorkflowContextMenu, {
      props: { ...defaultProps(recentWorkflow) },
      global: {
        plugins: [mockedStores.testingPinia],
      },
    });

    await nextTick();

    return { wrapper, mockedStores };
  };

  it("should render properly", async () => {
    const { wrapper } = await doMount();

    expect(wrapper.findComponent(MenuItems).props("items").length).toBe(1);
  });

  describe("show in SpaceExplorer", () => {
    const triggerOption = async (wrapper: VueWrapper<any>) => {
      await wrapper.findAll("li button").at(0)?.trigger("click");
    };

    const toast = mockedObject(getToastsProvider());

    it("should show a toast when an error is thrown", async () => {
      mockedAPI.desktop.getAncestorInfo.mockRejectedValue(new Error(""));

      const { wrapper } = await doMount({
        recentWorkflow: recentWorkflows.hubProject,
      });

      await triggerOption(wrapper);
      await flushPromises();

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Could not reveal project in Space Explorer.",
        }),
      );

      expect(routerPush).not.toHaveBeenCalled();
    });

    it("should not display option for server projects", async () => {
      const { wrapper } = await doMount({
        recentWorkflow: recentWorkflows.serverProject,
      });

      useSpaceProvidersStore().spaceProviders = PROVIDERS;

      await nextTick();

      expect(wrapper.findComponent(MenuItems).props("items").length).toBe(0);
    });

    it("should not display option if space groups are loading", async () => {
      const { wrapper, mockedStores } = await doMount({
        recentWorkflow: recentWorkflows.hubProject,
      });

      mockedStores.spaceProvidersStore.loadingProviderSpacesData[
        recentWorkflows.hubProject.origin.providerId
      ] = true;
      await nextTick();

      expect(wrapper.findComponent(MenuItems).props("items").length).toBe(0);
    });

    it("should reveal nested items in hub projects", async () => {
      mockedAPI.desktop.getAncestorInfo.mockResolvedValue({
        ancestorItemIds: ["3"],
        itemName: null,
      });

      const { wrapper } = await doMount({
        recentWorkflow: recentWorkflows.hubProjectNested,
      });

      await triggerOption(wrapper);
      await flushPromises();

      expect(toast.show).not.toHaveBeenCalled();
      expect(mockedAPI.desktop.getAncestorInfo).toHaveBeenCalled();

      // fetch is done in SpaceExplorer on change of ProjectPath
      // simulate loading being done:
      const spaceOperationsStore = useSpaceOperationsStore();
      spaceOperationsStore.isLoadingContent = true;
      await nextTick();

      spaceOperationsStore.isLoadingContent = false;
      await nextTick();

      expect(spaceOperationsStore.currentSelectedItemIds).toEqual([
        recentWorkflows.hubProjectNested.origin?.itemId,
      ]);
    });

    it("should show toast on name change on hub", async () => {
      mockedAPI.desktop.getAncestorInfo.mockResolvedValue({
        ancestorItemIds: ["3"],
        itemName: "Some other name",
      });

      const { wrapper } = await doMount({
        recentWorkflow: recentWorkflows.hubProjectNested,
      });

      await triggerOption(wrapper);
      await flushPromises();

      expect(mockedAPI.desktop.getAncestorInfo).toHaveBeenCalled();

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: "Name has changed",
          type: "warning",
        }),
      );
    });

    it("should reveal project in SpaceBrowsingPage", async () => {
      const project = recentWorkflows.localProjectNestedDeep!;
      const { wrapper } = await doMount({
        recentWorkflow: project,
      });

      await triggerOption(wrapper);
      await flushPromises();

      expect(toast.show).not.toHaveBeenCalled();

      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        params: {
          groupId: "group1",
          itemId: "2",
          spaceId: "local",
          spaceProviderId: "local",
        },
      });

      expect(useSpaceOperationsStore().currentSelectedItemIds).toEqual([
        project.origin?.itemId,
      ]);
    });
  });
});
