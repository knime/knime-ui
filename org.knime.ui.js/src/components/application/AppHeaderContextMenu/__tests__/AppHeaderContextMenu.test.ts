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
  const defaultProps = { position: { x: 0, y: 0 }, projectId: "project1" };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = ({
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

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const wrapper = mount(AppHeaderContextMenu, {
      props: { ...defaultProps, ...props },
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store, dispatchSpy };
  };

  it("should render properly", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(MenuItems).props("items").length).toBe(2);
  });

  describe("reveal in SpaceExplorer", () => {
    const triggerOption = async (wrapper: VueWrapper<any>) => {
      await wrapper.findAll("li button").at(0)?.trigger("click");
    };

    const toast = mockedObject(getToastsProvider());

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
      serverProject: createProject({
        projectId: "server-project",
        origin: {
          itemId: "1234",
          spaceId: "irrelevant",
          providerId: SERVER_PROVIDER.id,
        },
      }),
    };

    const doMountWithProjects = ({ props = {} } = {}) => {
      const mountResult = doMount({ props });
      const { $store } = mountResult;

      $store.commit("application/setOpenProjects", Object.values(openProjects));

      $store.state.spaces.spaceProviders = PROVIDERS;

      return mountResult;
    };

    it("should show a toast when project cannot be found", async () => {
      const { wrapper, dispatchSpy } = doMount();

      await triggerOption(wrapper);
      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Could not reveal project in Space Explorer.",
        }),
      );

      expect(dispatchSpy).not.toHaveBeenCalled();
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
        const { wrapper, $store } = doMountWithProjects({
          props: { projectId: project.projectId },
        });

        $store.commit("application/setActiveProjectId", project.projectId);

        await triggerOption(wrapper);
        await flushPromises();

        expect(toast.remove).toHaveBeenCalledOnce();
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

    it("should reveal nested items in hub projects", async () => {
      const projectId = openProjects.hubProjectNested.projectId;

      mockedAPI.desktop.getAncestorItemIds.mockResolvedValue(["3"]);

      const { wrapper, $store } = doMountWithProjects({
        props: { projectId },
      });

      $store.commit("application/setActiveProjectId", projectId);

      await triggerOption(wrapper);
      await flushPromises();

      expect(toast.remove).toHaveBeenCalledOnce();
      expect(toast.show).not.toHaveBeenCalled();
      expect($store.state.panel.activeTab).toEqual({
        [projectId]: panelStore.TABS.SPACE_EXPLORER,
      });
      expect(routerPush).not.toHaveBeenCalled();
      expect(mockedAPI.desktop.getAncestorItemIds).toHaveBeenCalled();
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
      const { wrapper, $store, dispatchSpy } = doMountWithProjects({
        props: { projectId: project.projectId },
      });

      $store.commit("application/setActiveProjectId", null);

      await triggerOption(wrapper);
      await flushPromises();

      expect(toast.remove).toHaveBeenCalledOnce();
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
    const { wrapper, dispatchSpy } = doMount();

    await wrapper.findAll("li button").at(-1)?.trigger("click");

    expect(dispatchSpy).toHaveBeenCalledWith(
      "workflow/closeProject",
      "project1",
    );
    expect(wrapper.emitted("itemClick")).toBeDefined();
  });
});
