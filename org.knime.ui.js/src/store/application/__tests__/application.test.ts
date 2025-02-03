import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import type { Project } from "@/api/gateway-api/generated-api.ts";
import { APP_ROUTES } from "@/router/appRoutes";
import { router } from "@/router/router";
import type { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeSize } from "@/style/shapes";
import {
  createNativeNode,
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { workflowNavigationService } from "@/util/workflowNavigationService";

import { applicationState, loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

vi.mock("@/util/workflowNavigationService", () => {
  return {
    workflowNavigationService: {
      nearestObject: vi.fn(),
    },
  };
});

describe("application", () => {
  it("should have dismissedUpdateBanner set to false by default", () => {
    const { applicationStore } = loadStore();
    expect(applicationStore.dismissedUpdateBanner).toBe(false);
  });

  it("returns the active project's origin", () => {
    const { applicationStore } = loadStore();
    applicationStore.setOpenProjects([
      createProject({
        projectId: "foo",
        origin: { itemId: "1", spaceId: "1", providerId: "1" },
      }),
      createProject({ projectId: "bee" }),
    ]);
    applicationStore.setActiveProjectId("foo");
    expect(applicationStore.activeProjectOrigin).toEqual({
      itemId: "1",
      spaceId: "1",
      providerId: "1",
    });
    applicationStore.setActiveProjectId("bee");
    expect(applicationStore.activeProjectOrigin).toBeNull();
    applicationStore.setActiveProjectId("baz");
    expect(applicationStore.activeProjectOrigin).toBeNull();
  });

  it("determines whether a project is of unknown origin", () => {
    const { applicationStore, spaceProvidersStore } = loadStore();
    applicationStore.setOpenProjects([
      // project without origin
      createProject({ projectId: "project1" }),
      // project with origin BUT KNOWN space
      createProject({
        projectId: "project2",
        origin: { providerId: "provider1", spaceId: "known-space" },
      }),
      // project with origin BUT UNKNOWN space
      createProject({
        projectId: "project3",
        origin: { providerId: "provider1", spaceId: "some-space" },
      }),
    ]);

    spaceProvidersStore.setSpaceProviders({
      provider1: createSpaceProvider({
        id: "provider1",
        spaceGroups: [
          createSpaceGroup({ spaces: [createSpace({ id: "known-space" })] }),
        ],
      }),
    });

    expect(applicationStore.isUnknownProject("project1")).toBe(true);
    expect(applicationStore.isUnknownProject("project2")).toBe(false);
    expect(applicationStore.isUnknownProject("project3")).toBe(true);
  });

  describe("getNextProjectId", () => {
    const { applicationStore } = loadStore();
    const projects: Project[] = Array.from({ length: 4 }, (_, i) => ({
      name: `project ${i + 1}`,
      projectId: `projectId${i + 1}`,
    }));

    it("returns active projectId if active project is not in closing projects", () => {
      const closingProjectIds = projects
        .slice(0, 3)
        .map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[3].projectId);

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBe(projects[3].projectId);
    });

    it("returns null if active project is closed and there is exactly one open project", () => {
      const closingProjectIds = projects
        .slice(0, 3)
        .map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[0].projectId);
      applicationStore.setOpenProjects([projects[3]]);

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBeNull();
    });

    it("returns null if active project is closed and there are at least two open projects which are alle closed", () => {
      const closingProjectIds = projects.map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[0].projectId);
      applicationStore.setOpenProjects(projects.slice(0, 2));

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBeNull();
    });

    it("returns projectId of next open project if active project is closed and at least one open project is not closed", () => {
      const { applicationStore } = loadStore();
      const closingProjectIds = projects
        .slice(0, 1)
        .map(({ projectId }) => projectId);
      applicationStore.setActiveProjectId(projects[0].projectId);
      applicationStore.setOpenProjects(projects.slice(0, 2));

      const nextProjectId = applicationStore.getNextProjectId({
        closingProjectIds,
      });

      expect(nextProjectId).toBe(projects[1].projectId);
    });
  });

  describe("replace application State", () => {
    it("replaces application state", () => {
      const { applicationStore } = loadStore();
      applicationStore.replaceApplicationState(applicationState);

      expect(applicationStore.openProjects).toStrictEqual([
        { projectId: "foo", name: "bar" },
      ]);
    });

    it("does not setWorkflow when replacing application state and the activeProject did not change", () => {
      const applicationState = {
        openProjects: [
          { projectId: "foo", name: "bar" },
          {
            projectId: "baz",
            name: "bar",
            activeWorkflow: { workflow: { info: {} } },
          },
        ],
      };
      const { applicationStore, lifecycleStore } = loadStore();
      applicationStore.setActiveProjectId("baz");
      applicationStore.replaceApplicationState(applicationState);

      expect(lifecycleStore.setWorkflow).not.toHaveBeenCalled();
      expect(applicationStore.activeProjectId).toBe("baz");
    });

    it("loads the proper (lastActive) workflow when the activeProject has an existing saved state", async () => {
      vi.useFakeTimers();
      const applicationState = {
        openProjects: [
          { projectId: "foo", name: "bar" },
          { projectId: "baz", name: "bar", activeWorkflowId: "root" },
        ],
      };
      const { applicationStore, canvasStateTrackingStore, lifecycleStore } =
        loadStore();
      canvasStateTrackingStore.setSavedCanvasStates({
        workflow: "root:2",
        project: "baz",
        zoomFactor: 1,
      });

      mockedAPI.desktop.getPersistedLocalStorageData.mockResolvedValue({});
      await lifecycleStore.initializeApplication({
        $router: router,
      });
      applicationStore.replaceApplicationState(applicationState);

      await lifecycleStore.setActiveProject({ $router: router });

      vi.runAllTimers();
      await flushPromises();

      expect(lifecycleStore.loadWorkflow).toHaveBeenCalledWith({
        projectId: "baz",
        workflowId: "root:2",
      });

      vi.useRealTimers();
    });

    it("replaces hasNodeCollectionActive", () => {
      const { applicationStore, nodeRepositoryStore } = loadStore();

      vi.mocked(nodeRepositoryStore.resetSearchAndTags).mockImplementation(() =>
        Promise.resolve(),
      );

      // first call sets the `hasNodeCollectionActive` flag from `null` to `true`, no refetch
      applicationStore.replaceApplicationState({
        hasNodeCollectionActive: true,
      });
      expect(nodeRepositoryStore.resetSearchAndTags).not.toHaveBeenCalled();

      // second call sets the flag from `true` to `false`, triggers a refetch
      applicationStore.replaceApplicationState({
        hasNodeCollectionActive: false,
      });
      expect(nodeRepositoryStore.resetSearchAndTags).toHaveBeenCalled();
    });
  });

  describe("set active workflow", () => {
    it("should be set if fetched from backend", async () => {
      const state = {
        openProjects: [
          { projectId: "foo", name: "bar" },
          {
            projectId: "bee",
            name: "gee",
            activeWorkflowId: "root",
          },
        ],
      };
      const { applicationStore, lifecycleStore, mockRouter } = loadStore();
      applicationStore.replaceApplicationState(state);
      await lifecycleStore.setActiveProject({
        // @ts-ignore
        $router: mockRouter,
      });

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: {
          projectId: "bee",
          workflowId: "root",
        },
        force: true,
      });
    });

    it("does not set active project and navigates to entry page if there are no open workflows", async () => {
      const state = { openProjects: [] };
      const { applicationStore, lifecycleStore, mockRouter } = loadStore();
      applicationStore.replaceApplicationState(state);
      await lifecycleStore.setActiveProject({
        // @ts-ignore
        $router: mockRouter,
      });

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.GetStarted,
      });
    });

    it("does not navigate to home page if already there when there are no open projects", async () => {
      const state = { openProjects: [] };
      const { applicationStore, lifecycleStore, mockRouter } = loadStore();
      mockRouter.currentRoute.value.name = APP_ROUTES.Home.SpaceBrowsingPage;

      applicationStore.replaceApplicationState(state);
      await lifecycleStore.setActiveProject({
        // @ts-ignore
        $router: mockRouter,
      });

      expect(mockRouter.push).not.toHaveBeenCalledWith({
        name: APP_ROUTES.Home.GetStarted,
      });
    });
  });

  describe("context Menu", () => {
    const createEvent = ({ x = 0, y = 0 } = {}) => {
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const eventMock = {
        clientX: x,
        clientY: y,
        preventDefault,
        stopPropagation,
      };

      return { event: eventMock, preventDefault, stopPropagation };
    };

    it("should set the context menu", async () => {
      const { event, preventDefault, stopPropagation } = createEvent({
        x: 200,
        y: 200,
      });
      const { applicationStore, selectionStore } = loadStore();

      // @ts-ignore
      // @ts-ignore
      await applicationStore.toggleContextMenu({ event });
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(applicationStore.contextMenu.isOpen).toBe(true);
      expect(applicationStore.contextMenu.position).toEqual({
        x: 200,
        y: 200,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    const createAndSetWorkflow = (
      store: ReturnType<typeof useWorkflowStore>,
    ) => {
      const node1 = createNativeNode({
        id: "root:1",
        position: { x: 25, y: 25 },
      });
      const node2 = createNativeNode({
        id: "root:2",
        position: { x: 20, y: 10 },
      });
      const annotation1 = createWorkflowAnnotation({
        id: "annotation:1",
        bounds: { x: 40, y: 10, width: 20, height: 20 },
      });
      const workflow = createWorkflow({
        nodes: {
          [node1.id]: node1,
          [node2.id]: node2,
        },
        workflowAnnotations: [annotation1],
      });
      store.setActiveWorkflow(workflow);
      return { node1, node2, annotation1, workflow };
    };

    it("should use the selected nodes as position if event has none (e.g. KeyboardEvent)", async () => {
      const { event, preventDefault, stopPropagation } = createEvent();
      const { selectionStore, applicationStore, workflowStore } = loadStore();

      const { node1, node2 } = createAndSetWorkflow(workflowStore);
      selectionStore.addNodesToSelection([node1.id, node2.id]);

      const mocked = mockedObject(workflowNavigationService);
      mocked.nearestObject.mockResolvedValueOnce({
        type: "node",
        id: node2.id,
        ...node2.position,
      });

      // @ts-ignore
      await applicationStore.toggleContextMenu({ event });
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(applicationStore.contextMenu.isOpen).toBe(true);
      expect(applicationStore.contextMenu.position).toEqual({
        x: 36,
        y: 26,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("should use the single (!) selected node as position if event has none (e.g. KeyboardEvent)", async () => {
      const { event, preventDefault, stopPropagation } = createEvent();
      const { selectionStore, applicationStore, workflowStore } = loadStore();

      const { node1 } = createAndSetWorkflow(workflowStore);
      selectionStore.addNodesToSelection([node1.id]);

      // @ts-ignore
      await applicationStore.toggleContextMenu({ event });
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(applicationStore.contextMenu.isOpen).toBe(true);
      // offset of a half node size
      const x = node1.position.x + nodeSize / 2;
      const y = node1.position.y + nodeSize / 2;
      expect(applicationStore.contextMenu.position).toEqual({
        x,
        y,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("should use center as fallback if event has no position and no nodes are selected", async () => {
      const { event, preventDefault, stopPropagation } = createEvent();
      const { selectionStore, applicationStore, canvasStore } = loadStore();

      // @ts-ignore
      canvasStore.getCenterOfScrollContainer = () => ({ x: 10, y: 10 });

      // @ts-ignore
      await applicationStore.toggleContextMenu({ event });
      expect(selectionStore.deselectAllObjects).not.toHaveBeenCalled();
      expect(applicationStore.contextMenu.isOpen).toBe(true);
      expect(applicationStore.contextMenu.position).toEqual({
        x: 10,
        y: 10,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("should deselect all objects if parameter is given", async () => {
      const { event, preventDefault, stopPropagation } = createEvent({
        x: 200,
        y: 200,
      });
      const { selectionStore, applicationStore } = loadStore();

      await applicationStore.toggleContextMenu({
        // @ts-ignore
        event,
        deselectAllObjects: true,
      });
      expect(selectionStore.deselectAllObjects).toHaveBeenCalled();
      expect(applicationStore.contextMenu.isOpen).toBe(true);
      expect(applicationStore.contextMenu.position).toEqual({
        x: 200,
        y: 200,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("should hide the menu", async () => {
      const { applicationStore } = loadStore();
      applicationStore.contextMenu = {
        isOpen: true,
        position: { x: 200, y: 200 },
      };
      const { event, preventDefault } = createEvent();

      // @ts-ignore
      await applicationStore.toggleContextMenu({ event });

      expect(applicationStore.contextMenu.isOpen).toBe(false);
      expect(applicationStore.contextMenu.position).toBeNull();
      expect(preventDefault).toHaveBeenCalled();
    });

    it("should hide the menu when leaving the worklow page", async () => {
      const { applicationStore, lifecycleStore } = loadStore();

      mockedAPI.desktop.getPersistedLocalStorageData.mockResolvedValue({});
      await lifecycleStore.initializeApplication({
        $router: router,
      });

      applicationStore.contextMenu = {
        isOpen: true,
        position: { x: 200, y: 200 },
      };

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      await router.push({ name: APP_ROUTES.Home.GetStarted });

      expect(applicationStore.toggleContextMenu).toHaveBeenCalled();
    });

    it.each([
      ["PortTypeMenu", "portTypeMenu"] as const,
      ["QuickAddNodeMenu", "quickActionMenu"] as const,
    ])(
      "closes the %s if its open when context menu opens",
      async (_, stateMenuKey) => {
        const { applicationStore, floatingMenusStore } = loadStore();
        const menuCloseMock = vi.fn();
        // @ts-ignore
        floatingMenusStore[stateMenuKey] = {
          isOpen: true,
          events: {
            menuClose: menuCloseMock,
          },
        };
        const { event } = createEvent();

        // @ts-ignore
        await applicationStore.toggleContextMenu({ event });
        expect(applicationStore.contextMenu.isOpen).toBe(true);
        expect(menuCloseMock).toHaveBeenCalled();
      },
    );
  });
});
