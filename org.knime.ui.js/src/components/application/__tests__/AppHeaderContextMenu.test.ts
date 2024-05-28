import { afterEach, describe, expect, it, vi } from "vitest";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";

import { mockVuexStore, mockedObject } from "@/test/utils";
import * as spacesStore from "@/store/spaces";
import * as applicationStore from "@/store/application";
import * as panelStore from "@/store/panel";

import AppHeaderContextMenu from "../AppHeaderContextMenu.vue";
import MenuItems from "webapps-common/ui/components/MenuItems.vue";
import { getToastsProvider } from "@/plugins/toasts";
import {
  createProject,
  createSpace,
  createSpaceProvider,
} from "@/test/factories";
import { SpaceProviderNS } from "@/api/custom-types";
import { APP_ROUTES } from "@/router/appRoutes";

const routerPush = vi.fn();

vi.mock("webapps-common/ui/services/toast");
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: routerPush })),
  useRoute: vi.fn(() => ({})),
}));

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

  // TODO: bring back test case once navigation to SpaceBrowsingPage is improved
  describe.skip("reveal in SpaceExplorer", () => {
    const triggerOption = async (wrapper: VueWrapper<any>) => {
      await wrapper.findAll("li button").at(0)?.trigger("click");
    };

    const toast = mockedObject(getToastsProvider());

    const openProjects = [
      createProject({
        projectId: "no-origin",
      }),
      createProject({
        projectId: "local-project-root",
        origin: {
          ancestorItemIds: [],
          itemId: "1234",
          spaceId: "local",
          providerId: "local",
        },
      }),
      createProject({
        projectId: "local-project-nested",
        origin: {
          itemId: "1234",
          ancestorItemIds: ["1"],
          spaceId: "local",
          providerId: "local",
        },
      }),
      createProject({
        projectId: "local-project-nested-deep",
        origin: {
          itemId: "1234",
          ancestorItemIds: ["2", "1"],
          spaceId: "local",
          providerId: "local",
        },
      }),
      createProject({
        projectId: "hub-project",
        origin: {
          itemId: "1234",
          spaceId: "space1",
          providerId: "hub-provider1",
        },
      }),
      createProject({
        projectId: "server-project",
        origin: {
          itemId: "1234",
          spaceId: "irrelevant",
          providerId: "server-provider1",
        },
      }),
    ];

    const doMountWithProjects = ({ props = {} } = {}) => {
      const mountResult = doMount({ props });
      const { $store } = mountResult;

      $store.commit("application/setOpenProjects", openProjects);

      $store.state.spaces.spaceProviders = {
        local: createSpaceProvider({
          id: "local",
          connected: true,
          connectionMode: "AUTOMATIC",
          name: "Local Space",
          type: SpaceProviderNS.TypeEnum.LOCAL,
          spaces: [
            createSpace({
              id: "local",
              name: "Local Space",
              owner: "local",
            }),
          ],
        }),
        [openProjects.at(4)!.origin!.providerId]: createSpaceProvider({
          id: "hub-provider1",
          name: "Hub space",
          type: SpaceProviderNS.TypeEnum.HUB,
          spaces: [createSpace({ id: "space1" })],
        }),
        [openProjects.at(5)!.origin!.providerId]: createSpaceProvider({
          id: "server-provider1",
          name: "Server space",
          type: SpaceProviderNS.TypeEnum.SERVER,
          spaces: [createSpace()],
        }),
      };

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
        openProjects.at(1)!,
        {
          itemId: "root",
          spaceId: openProjects.at(1)!.origin?.spaceId,
          spaceProviderId: openProjects.at(1)!.origin?.providerId,
        },
      ],
      [
        "local project nested",
        openProjects.at(2)!,
        {
          itemId: openProjects.at(2)!.origin?.ancestorItemIds?.at(0),
          spaceId: openProjects.at(2)!.origin?.spaceId,
          spaceProviderId: openProjects.at(2)!.origin?.providerId,
        },
      ],
      [
        "local project nested deep",
        openProjects.at(3)!,
        {
          itemId: openProjects.at(3)!.origin?.ancestorItemIds?.at(0),
          spaceId: openProjects.at(3)!.origin?.spaceId,
          spaceProviderId: openProjects.at(3)!.origin?.providerId,
        },
      ],
      [
        "hub project",
        openProjects.at(4)!,
        {
          itemId: "root",
          spaceId: openProjects.at(4)!.origin?.spaceId,
          spaceProviderId: openProjects.at(4)!.origin?.providerId,
        },
      ],
    ])(
      "should reveal project in sidepanel for -> %s",
      async (_, project, expectedPath) => {
        const { wrapper, $store, dispatchSpy } = doMountWithProjects({
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
        expect(dispatchSpy).toHaveBeenCalledWith(
          "spaces/fetchWorkflowGroupContent",
          { projectId: project.projectId },
        );

        expect($store.state.spaces.currentSelectedItemIds).toEqual([
          project.origin?.itemId,
        ]);
      },
    );

    it("should reveal project in SpaceBrowsingPage when there's no active project", async () => {
      const project = openProjects.at(3)!;
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
        name: APP_ROUTES.SpaceBrowsingPage,
      });
      expect($store.state.spaces.projectPath).toEqual(
        expect.objectContaining({
          [spacesStore.globalSpaceBrowserProjectId]: {
            itemId: project!.origin?.ancestorItemIds?.at(0),
            spaceId: project!.origin?.spaceId,
            spaceProviderId: project!.origin?.providerId,
          },
        }),
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        "spaces/fetchWorkflowGroupContent",
        { projectId: spacesStore.globalSpaceBrowserProjectId },
      );

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
