import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { Store } from "vuex";

import { APP_ROUTES } from "@/router/appRoutes";
import { router } from "@/router/router";
import type { RootStoreState } from "@/store/types";
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
import { mockedObject } from "@/test/utils";
import { workflowNavigationService } from "@/util/workflowNavigationService";

import { applicationState, loadStore } from "./loadStore";

vi.mock("@/util/workflowNavigationService", () => {
  return {
    workflowNavigationService: {
      nearestObject: vi.fn(),
    },
  };
});

describe("application::index", () => {
  it("should have dismissedUpdateBanner set to false by default", () => {
    const { store } = loadStore();
    expect(store.state.application.dismissedUpdateBanner).toBe(false);
  });

  it("should update dismissedUpdateBanner using setDismissedUpdateBanner", () => {
    const { store } = loadStore();
    store.commit("application/setDismissedUpdateBanner", true);
    expect(store.state.application.dismissedUpdateBanner).toBe(true);

    store.commit("application/setDismissedUpdateBanner", false);
    expect(store.state.application.dismissedUpdateBanner).toBe(false);
  });

  it("returns the active project's origin", () => {
    const { store } = loadStore();
    store.commit("application/setOpenProjects", [
      { projectId: "foo", origin: { mockOrigin: true } },
      { projectId: "bee" },
    ]);
    store.commit("application/setActiveProjectId", "foo");
    expect(store.getters["application/activeProjectOrigin"]).toEqual({
      mockOrigin: true,
    });
    store.commit("application/setActiveProjectId", "bee");
    expect(store.getters["application/activeProjectOrigin"]).toBeNull();
    store.commit("application/setActiveProjectId", "baz");
    expect(store.getters["application/activeProjectOrigin"]).toBeNull();
  });

  it("determines whether a project is of unknown origin", () => {
    const { store } = loadStore();
    store.commit("application/setOpenProjects", [
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

    store.commit("spaces/setSpaceProviders", {
      provider1: createSpaceProvider({
        id: "provider1",
        spaceGroups: [
          createSpaceGroup({ spaces: [createSpace({ id: "known-space" })] }),
        ],
      }),
    });

    expect(store.getters["application/isUnknownProject"]("project1")).toBe(
      true,
    );
    expect(store.getters["application/isUnknownProject"]("project2")).toBe(
      false,
    );
    expect(store.getters["application/isUnknownProject"]("project3")).toBe(
      true,
    );
  });

  describe("replace application State", () => {
    it("replaces application state", async () => {
      const { store } = loadStore();
      await store.dispatch(
        "application/replaceApplicationState",
        applicationState,
      );

      expect(store.state.application.openProjects).toStrictEqual([
        { projectId: "foo", name: "bar" },
      ]);
    });

    it("does not setWorkflow when replacing application state and the activeProject did not change", async () => {
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
      const { store, dispatchSpy } = loadStore();
      store.commit("application/setActiveProjectId", "baz");
      await store.dispatch(
        "application/replaceApplicationState",
        applicationState,
      );

      expect(dispatchSpy).not.toHaveBeenCalledWith("application/setWorkflow");
      expect(store.state.application.activeProjectId).toBe("baz");
    });

    it("loads the proper (lastActive) workflow when the activeProject has an existing saved state", async () => {
      vi.useFakeTimers();
      const applicationState = {
        openProjects: [
          { projectId: "foo", name: "bar" },
          { projectId: "baz", name: "bar", activeWorkflowId: "root" },
        ],
      };
      const { store, dispatchSpy } = loadStore();
      store.commit("application/setSavedCanvasStates", {
        workflow: "root:2",
        project: "baz",
      });

      await store.dispatch("application/initializeApplication", {
        $router: router,
      });
      await store.dispatch(
        "application/replaceApplicationState",
        applicationState,
      );
      await store.dispatch("application/setActiveProject", { $router: router });

      vi.runAllTimers();
      await flushPromises();

      expect(dispatchSpy).toHaveBeenCalledWith("application/loadWorkflow", {
        projectId: "baz",
        workflowId: "root:2",
      });

      vi.useRealTimers();
    });

    it("replaces hasNodeCollectionActive", async () => {
      const { store, dispatchSpy } = loadStore();

      // first call sets the `hasNodeCollectionActive` flag from `null` to `true`, no refetch
      await store.dispatch("application/replaceApplicationState", {
        hasNodeCollectionActive: true,
      });
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "nodeRepository/resetSearchTagsAndTree",
        expect.anything(),
      );

      // second call sets the flag from `true` to `false`, triggers a refetch
      await store.dispatch("application/replaceApplicationState", {
        hasNodeCollectionActive: false,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        "nodeRepository/resetSearchTagsAndTree",
        expect.anything(),
      );
    });
  });

  describe("set active workflow", () => {
    it("if fetched from backend", async () => {
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
      const { store, mockRouter } = loadStore();
      await store.dispatch("application/replaceApplicationState", state);
      await store.dispatch("application/setActiveProject", {
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
      const { store, mockRouter } = loadStore();
      await store.dispatch("application/replaceApplicationState", state);
      await store.dispatch("application/setActiveProject", {
        $router: mockRouter,
      });

      expect(mockRouter.push).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.GetStarted,
      });
    });

    it("does not navigate to home page if already there when there are no open projects", async () => {
      const state = { openProjects: [] };
      const { store, mockRouter } = loadStore();
      mockRouter.currentRoute.value.name = APP_ROUTES.Home.SpaceBrowsingPage;

      await store.dispatch("application/replaceApplicationState", state);
      await store.dispatch("application/setActiveProject", {
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
      const { store, mockedGetters, dispatchSpy } = loadStore();

      await store.dispatch("application/toggleContextMenu", { event });
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "selection/deselectAllObjects",
        null,
      );
      expect(store.state.application.contextMenu.isOpen).toBe(true);
      expect(mockedGetters.canvas.screenToCanvasCoordinates).toHaveBeenCalled();
      expect(store.state.application.contextMenu.position).toEqual({
        x: 200,
        y: 200,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    const createAndSetWorkflow = (store: Store<RootStoreState>) => {
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
      store.commit("workflow/setActiveWorkflow", workflow);
      return { node1, node2, annotation1, workflow };
    };

    it("should use the selected nodes as position if event has none (e.g. KeyboardEvent)", async () => {
      const { event, preventDefault, stopPropagation } = createEvent();
      const { store, dispatchSpy } = loadStore();

      const { node1, node2 } = createAndSetWorkflow(store);
      store.commit("selection/addNodesToSelection", [node1.id, node2.id]);

      const mocked = mockedObject(workflowNavigationService);
      mocked.nearestObject.mockResolvedValueOnce({
        type: "node",
        id: node2.id,
        ...node2.position,
      });

      await store.dispatch("application/toggleContextMenu", { event });
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "selection/deselectAllObjects",
        null,
      );
      expect(store.state.application.contextMenu.isOpen).toBe(true);
      expect(store.state.application.contextMenu.position).toEqual({
        x: 36,
        y: 26,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("should use the single (!) selected node as position if event has none (e.g. KeyboardEvent)", async () => {
      const { event, preventDefault, stopPropagation } = createEvent();
      const { store, dispatchSpy } = loadStore();

      const { node1 } = createAndSetWorkflow(store);
      store.commit("selection/addNodesToSelection", [node1.id]);

      await store.dispatch("application/toggleContextMenu", { event });
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "selection/deselectAllObjects",
        null,
      );
      expect(store.state.application.contextMenu.isOpen).toBe(true);
      // offset of a half node size
      const x = node1.position.x + nodeSize / 2;
      const y = node1.position.y + nodeSize / 2;
      expect(store.state.application.contextMenu.position).toEqual({
        x,
        y,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("should use center as fallback if event has no position and no nodes are selected", async () => {
      const { event, preventDefault, stopPropagation } = createEvent();
      const { store, dispatchSpy } = loadStore();

      await store.dispatch("application/toggleContextMenu", { event });
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "selection/deselectAllObjects",
        null,
      );
      expect(store.state.application.contextMenu.isOpen).toBe(true);
      expect(store.state.application.contextMenu.position).toEqual({
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
      const { store, mockedGetters, dispatchSpy } = loadStore();

      await store.dispatch("application/toggleContextMenu", {
        event,
        deselectAllObjects: true,
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        "selection/deselectAllObjects",
        null,
      );
      expect(store.state.application.contextMenu.isOpen).toBe(true);
      expect(mockedGetters.canvas.screenToCanvasCoordinates).toHaveBeenCalled();
      expect(store.state.application.contextMenu.position).toEqual({
        x: 200,
        y: 200,
      });
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it("should hide the menu", async () => {
      const { store } = loadStore();
      store.state.application.contextMenu = {
        isOpen: true,
        position: { x: 200, y: 200 },
      };
      const { event, preventDefault } = createEvent();

      await store.dispatch("application/toggleContextMenu", { event });

      expect(store.state.application.contextMenu.isOpen).toBe(false);
      expect(store.state.application.contextMenu.position).toBeNull();
      expect(preventDefault).toHaveBeenCalled();
    });

    it("should hide the menu when leaving the worklow page", async () => {
      const { store, dispatchSpy } = loadStore();

      await store.dispatch("application/initializeApplication", {
        $router: router,
      });

      store.state.application.contextMenu = {
        isOpen: true,
        position: { x: 200, y: 200 },
      };

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      await router.push({ name: APP_ROUTES.Home.GetStarted });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/toggleContextMenu",
        undefined,
      );
    });

    it.each([
      ["PortTypeMenu", "portTypeMenu"],
      ["QuickAddNodeMenu", "quickActionMenu"],
    ])(
      "closes the %s if its open when context menu opens",
      async (_, stateMenuKey) => {
        const { store } = loadStore();
        const menuCloseMock = vi.fn();
        // @ts-ignore
        store.state.workflow[stateMenuKey] = {
          isOpen: true,
          events: {
            menuClose: menuCloseMock,
          },
        };
        const { event } = createEvent();

        await store.dispatch("application/toggleContextMenu", { event });
        expect(store.state.application.contextMenu.isOpen).toBe(true);
        expect(menuCloseMock).toHaveBeenCalled();
      },
    );
  });

  describe("mutations", () => {
    it("allows setting the active id", () => {
      const { store } = loadStore();
      store.commit("application/setActiveProjectId", "foo");
      expect(store.state.application.activeProjectId).toBe("foo");
    });

    it("allows setting openProjects", () => {
      const { store } = loadStore();
      store.commit("application/setOpenProjects", [
        { projectId: "foo", name: "bar" },
        { projectId: "bee", name: "gee" },
      ]);

      expect(store.state.application.openProjects).toStrictEqual([
        { projectId: "foo", name: "bar" },
        { projectId: "bee", name: "gee" },
      ]);
    });

    it("sets the available port types", () => {
      const { store } = loadStore();
      store.commit("application/setAvailablePortTypes", {
        "port type id": { kind: "table", name: "Data" },
      });
      expect(store.state.application.availablePortTypes).toStrictEqual({
        "port type id": { kind: "table", name: "Data" },
      });
    });

    it("sets the suggested port types", () => {
      const { store } = loadStore();
      store.commit("application/setSuggestedPortTypes", ["type1", "type2"]);
      expect(store.state.application.suggestedPortTypes).toStrictEqual([
        "type1",
        "type2",
      ]);
    });
  });
});
