import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";

import { MenuItems } from "@knime/components";

import { API } from "@/api";
import { SpaceProviderNS } from "@/api/custom-types";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import * as applicationStore from "@/store/application";
import * as panelStore from "@/store/panel";
import * as spacesStore from "@/store/spaces";
import {
  createProject,
  createSpace,
  createSpaceProvider,
} from "@/test/factories";
import { deepMocked, mockVuexStore, mockedObject } from "@/test/utils";
import AppHeaderContextMenu from "../AppHeaderContextMenu.vue";

const routerPush = vi.fn();

vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    useToasts: vi.fn(),
  };
});
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: routerPush })),
  useRoute: vi.fn(() => ({})),
}));

const mockedAPI = deepMocked(API);

describe("AppHeaderContextMenu.vue", () => {
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
      id: LOCAL_PROVIDER.id,
      connected: true,
      connectionMode: "AUTOMATIC",
      name: "Local Space",
      type: SpaceProviderNS.TypeEnum.LOCAL,
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

  const openProjects = {
    noOrigin: createProject({ projectId: "no-origin" }),
    localProjectRoot: createProject({
      projectId: "local-project-root",
      origin: {
        ancestorItemIds: [],
        itemId: "1234",
        spaceId: LOCAL_PROVIDER.spaceId,
        providerId: LOCAL_PROVIDER.id,
      },
    }),
    localProjectNested: createProject({
      projectId: "local-project-nested",
      origin: {
        itemId: "1234",
        ancestorItemIds: ["1"],
        spaceId: LOCAL_PROVIDER.spaceId,
        providerId: LOCAL_PROVIDER.id,
      },
    }),
    localProjectNestedDeep: createProject({
      projectId: "local-project-nested-deep",
      origin: {
        itemId: "1234",
        ancestorItemIds: ["2", "1"],
        spaceId: LOCAL_PROVIDER.spaceId,
        providerId: LOCAL_PROVIDER.id,
      },
    }),
    hubProject: createProject({
      projectId: "hub-project",
      origin: {
        itemId: "1234",
        spaceId: HUB_PROVIDER.space1Id,
        providerId: HUB_PROVIDER.id,
      },
    }),
    hubProjectNested: createProject({
      projectId: "hub-project-nested",
      origin: {
        itemId: "1234",
        ancestorItemIds: ["1"],
        spaceId: HUB_PROVIDER.space1Id,
        providerId: HUB_PROVIDER.id,
      },
    }),
    hubProjectUnknown: createProject({
      projectId: "hub-project-unknown",
      origin: {
        itemId: "1234",
        spaceId: "some unknown space",
        providerId: "some unknown provider",
      },
    }),
    serverProject: createProject({
      projectId: "server-project",
      origin: {
        itemId: "1234",
        spaceId: "irrelevant",
        providerId: SERVER_PROVIDER.id,
      },
    }),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    position: { x: 0, y: 0 },
    projectId: openProjects.localProjectRoot.projectId,
  };

  const doMount = async ({
    props = {},
  }: { props?: Partial<typeof defaultProps> } = {}) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
      application: applicationStore,
      panel: panelStore,
      workflow: {
        actions: {
          closeProject: () => {},
        },
      },
    });

    $store.commit("application/setOpenProjects", Object.values(openProjects));
    $store.commit("application/setActiveProjectId", props.projectId);
    $store.state.spaces.spaceProviders = PROVIDERS;

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const wrapper = mount(AppHeaderContextMenu, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
      },
    });

    await nextTick();

    return { wrapper, $store, dispatchSpy };
  };

  it("should render properly", async () => {
    const { wrapper } = await doMount();

    expect(wrapper.findComponent(MenuItems).props("items").length).toBe(2);
  });

  describe("reveal in SpaceExplorer", () => {
    const triggerOption = async (wrapper: VueWrapper<any>) => {
      await wrapper.findAll("li button").at(0)?.trigger("click");
    };

    const toast = mockedObject(getToastsProvider());

    it("should show a toast when an error is thrown", async () => {
      mockedAPI.desktop.getAncestorInfo.mockRejectedValue(new Error(""));

      const { wrapper } = await doMount({
        props: { projectId: openProjects.hubProject.projectId },
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

    it.each([
      [
        "local project on root",
        openProjects.localProjectRoot!,
        {
          itemId: "root",
          spaceId: LOCAL_PROVIDER.spaceId,
          spaceProviderId: LOCAL_PROVIDER.id,
        },
      ],
      [
        "local project nested",
        openProjects.localProjectNested!,
        {
          itemId:
            openProjects.localProjectNested!.origin?.ancestorItemIds?.at(0),
          spaceId: LOCAL_PROVIDER.spaceId,
          spaceProviderId: LOCAL_PROVIDER.id,
        },
      ],
      [
        "local project nested deep",
        openProjects.localProjectNestedDeep!,
        {
          itemId:
            openProjects.localProjectNestedDeep!.origin?.ancestorItemIds?.at(0),
          spaceId: LOCAL_PROVIDER.spaceId,
          spaceProviderId: LOCAL_PROVIDER.id,
        },
      ],
      [
        "hub project",
        openProjects.hubProject!,
        {
          itemId: "root",
          spaceId: HUB_PROVIDER.space1Id,
          spaceProviderId: HUB_PROVIDER.id,
        },
      ],
    ])(
      "should reveal project in sidepanel for -> %s",
      async (_, project, expectedPath) => {
        mockedAPI.desktop.getAncestorInfo.mockResolvedValue({
          ancestorItemIds: [],
          itemName: null,
        });

        const { wrapper, $store } = await doMount({
          props: { projectId: project.projectId },
        });

        $store.commit("application/setActiveProjectId", project.projectId);
        await nextTick();

        await triggerOption(wrapper);
        await flushPromises();

        expect(toast.show).not.toHaveBeenCalled();
        expect($store.state.panel.activeTab).toEqual({
          [project.projectId]: panelStore.TABS.SPACE_EXPLORER,
        });
        expect(routerPush).not.toHaveBeenCalled();
        expect($store.state.spaces.projectPath).toEqual(
          expect.objectContaining({
            [project.projectId]: expectedPath,
          }),
        );

        // fetch is done in SpaceExplorer on change of ProjectPath
        // simulate loading being done:
        $store.state.spaces.isLoadingContent = true;
        await nextTick();

        $store.state.spaces.isLoadingContent = false;
        await nextTick();

        expect($store.state.spaces.currentSelectedItemIds).toEqual([
          project.origin?.itemId,
        ]);
      },
    );

    it("should not display option for server projects", async () => {
      const projectId = openProjects.serverProject.projectId;

      const { wrapper, $store } = await doMount({
        props: { projectId },
      });

      $store.commit("application/setOpenProjects", Object.values(openProjects));
      $store.state.spaces.spaceProviders = PROVIDERS;

      $store.commit("application/setActiveProjectId", projectId);
      await nextTick();

      expect(wrapper.findComponent(MenuItems).props("items").length).toBe(1);
      expect(wrapper.findComponent(MenuItems).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: "Close project" }),
        ]),
      );
    });

    it("should not display option for projects without an origin", async () => {
      const projectId = openProjects.noOrigin.projectId;

      mockedAPI.desktop.getAncestorInfo.mockResolvedValue({
        ancestorItemIds: [],
        itemName: null,
      });

      const { wrapper } = await doMount({
        props: { projectId },
      });

      expect(wrapper.findComponent(MenuItems).props("items").length).toBe(1);
      expect(wrapper.findComponent(MenuItems).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: "Close project" }),
        ]),
      );
    });

    it("should reveal nested items in hub projects", async () => {
      const projectId = openProjects.hubProjectNested.projectId;

      mockedAPI.desktop.getAncestorInfo.mockResolvedValue({
        ancestorItemIds: ["3"],
        itemName: null,
      });

      const { wrapper, $store } = await doMount({
        props: { projectId },
      });

      $store.commit("application/setActiveProjectId", projectId);

      await triggerOption(wrapper);
      await flushPromises();

      expect(toast.show).not.toHaveBeenCalled();
      expect($store.state.panel.activeTab).toEqual({
        [projectId]: panelStore.TABS.SPACE_EXPLORER,
      });
      expect(routerPush).not.toHaveBeenCalled();
      expect(mockedAPI.desktop.getAncestorInfo).toHaveBeenCalled();
      expect($store.state.spaces.projectPath).toEqual(
        expect.objectContaining({
          [projectId]: {
            itemId: "3",
            spaceId: openProjects.hubProjectNested.origin?.spaceId,
            spaceProviderId: openProjects.hubProjectNested.origin?.providerId,
          },
        }),
      );

      // fetch is done in SpaceExplorer on change of ProjectPath
      // simulate loading being done:
      $store.state.spaces.isLoadingContent = true;
      await nextTick();

      $store.state.spaces.isLoadingContent = false;
      await nextTick();

      expect($store.state.spaces.currentSelectedItemIds).toEqual([
        openProjects.hubProjectNested.origin?.itemId,
      ]);
    });

    it("should reveal project in SpaceBrowsingPage when there's no active project", async () => {
      const project = openProjects.localProjectNestedDeep!;
      const { wrapper, $store, dispatchSpy } = await doMount({
        props: { projectId: project.projectId },
      });

      $store.commit("application/setActiveProjectId", null);

      await triggerOption(wrapper);
      await flushPromises();

      expect(toast.show).not.toHaveBeenCalled();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "panel/setCurrentProjectActiveTab",
        panelStore.TABS.SPACE_EXPLORER,
      );
      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        params: {
          groupId: "group1",
          itemId: "2",
          spaceId: "local",
          spaceProviderId: "local",
        },
      });

      expect($store.state.spaces.currentSelectedItemIds).toEqual([
        project.origin?.itemId,
      ]);
    });
  });

  it("should handle closing a project", async () => {
    const { wrapper, dispatchSpy } = await doMount();

    await wrapper.findAll("li button").at(-1)?.trigger("click");

    expect(dispatchSpy).toHaveBeenCalledWith(
      "workflow/closeProject",
      defaultProps.projectId,
    );
    expect(wrapper.emitted("itemClick")).toBeDefined();
  });
});
