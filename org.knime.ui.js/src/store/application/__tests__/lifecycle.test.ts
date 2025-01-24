import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";
import { createRouter, createWebHistory } from "vue-router";

import { runInEnvironment } from "@/environment";
import { APP_ROUTES } from "@/router/appRoutes";
import { router, routes } from "@/router/router";
import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { lifecycleBus } from "../lifecycle-events";

import { applicationState, loadStore } from "./loadStore";

vi.mock("@/util/generateWorkflowPreview");
const mockedAPI = deepMocked(API);

vi.mock("@/environment");

describe("application::lifecycle", () => {
  const getRouter = () => {
    return createRouter({
      history: createWebHistory(),
      routes,
    });
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("application Lifecycle", () => {
    it("initialization (DESKTOP)", async () => {
      const router = getRouter();

      // @ts-ignore
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.DESKTOP?.());
      const { lifecycleStore, applicationStore } = loadStore();
      window.localStorage.setItem("foo", "bar");
      const localStorageData = {
        settings1: { a: 1, b: 2 },
        settings2: { c: 3, d: 4 },
        foo: {}, // will be removed from local storage because it's empty
      };
      mockedAPI.desktop.getPersistedLocalStorageData.mockResolvedValue(
        localStorageData,
      );
      const exampleProjects = [{ name: "test" }];
      mockedAPI.desktop.getExampleProjects.mockResolvedValue(exampleProjects);
      await lifecycleStore.initializeApplication({
        $router: router,
      });

      expect(lifecycleStore.setIsLoadingApp).not.toHaveBeenCalled();
      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalled();
      expect(mockedAPI.application.getState).toHaveBeenCalled();
      expect(mockedAPI.desktop.getPersistedLocalStorageData).toHaveBeenCalled();
      expect(window.localStorage.getItem("settings1")).toBe(
        JSON.stringify(localStorageData.settings1),
      );
      expect(window.localStorage.getItem("settings2")).toBe(
        JSON.stringify(localStorageData.settings2),
      );
      expect(window.localStorage.getItem("foo")).toBeNull();
      expect(mockedAPI.desktop.getExampleProjects).toHaveBeenCalled();

      expect(applicationStore.exampleProjects).toEqual(exampleProjects);

      expect(applicationStore.replaceApplicationState).toHaveBeenCalledWith(
        applicationState,
      );

      expect(lifecycleStore.setActiveProject).toHaveBeenCalledWith({
        $router: router,
      });
    });

    it("initialization (BROWSER)", async () => {
      const router = getRouter();
      // @ts-ignore
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.BROWSER?.());

      const { lifecycleStore, applicationStore } = loadStore();
      await lifecycleStore.initializeApplication({
        $router: router,
      });

      expect(lifecycleStore.setIsLoadingApp).toHaveBeenCalledWith(true);

      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalled();
      expect(mockedAPI.application.getState).toHaveBeenCalled();

      expect(applicationStore.replaceApplicationState).toHaveBeenCalledWith(
        applicationState,
      );
      expect(lifecycleStore.setActiveProject).toHaveBeenCalledWith({
        $router: router,
      });
    });

    it("destroy application", () => {
      const { lifecycleStore } = loadStore();
      lifecycleStore.destroyApplication();

      expect(mockedAPI.event.unsubscribeEventListener).toHaveBeenCalled();
      expect(lifecycleStore.unloadActiveWorkflow).toHaveBeenCalledWith({
        clearWorkflow: true,
      });
    });
  });

  describe("workflow Lifecycle", () => {
    it("loads root workflow successfully", async () => {
      const onWorkflowLoaded = vi.fn();

      lifecycleBus.once("onWorkflowLoaded", onWorkflowLoaded);

      const mockWorkflow = createWorkflow();
      const { lifecycleStore, workflowStore } = loadStore();

      expect(onWorkflowLoaded).not.toHaveBeenCalled();

      mockedAPI.workflow.getWorkflow.mockResolvedValue({
        workflow: mockWorkflow,
        snapshotId: "snap",
      });

      await lifecycleStore.loadWorkflow({
        projectId: mockWorkflow.projectId,
      });

      expect(onWorkflowLoaded).toHaveBeenCalled();

      expect(lifecycleStore.beforeSetActivateWorkflow).toHaveBeenCalledWith({
        workflow: mockWorkflow,
      });

      expect(mockedAPI.workflow.getWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: mockWorkflow.info.containerId,
          projectId: mockWorkflow.projectId,
        }),
      );

      expect(lifecycleStore.afterSetActivateWorkflow).toHaveBeenCalled();

      expect(
        deepMocked(API).desktop.setProjectActiveAndEnsureItsLoaded,
      ).toHaveBeenCalledWith({ projectId: mockWorkflow.projectId });
      expect(workflowStore.activeWorkflow).toStrictEqual(mockWorkflow);
      expect(workflowStore.activeSnapshotId).toBe("snap");
      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: mockWorkflow.projectId,
        workflowId: mockWorkflow.info.containerId,
        snapshotId: "snap",
      });
    });

    it("loads inner workflow successfully", async () => {
      const { lifecycleStore, workflowStore } = loadStore();
      mockedAPI.workflow.getWorkflow.mockResolvedValue({
        workflow: { dummy: true, info: { containerId: "root" }, nodes: [] },
      });
      await lifecycleStore.loadWorkflow({
        projectId: "wf2",
        workflowId: "root:0:123",
      });

      expect(mockedAPI.workflow.getWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: "root:0:123", projectId: "wf2" }),
      );

      expect(workflowStore.activeWorkflow).toStrictEqual({
        dummy: true,
        info: { containerId: "root" },
        nodes: [],
        projectId: "wf2",
      });

      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: "wf2",
        workflowId: "root",
      });
    });

    it("unloads workflow when another one is loaded", async () => {
      const { lifecycleStore, workflowStore, selectionStore } = loadStore();
      mockedAPI.workflow.getWorkflow.mockResolvedValue({
        workflow: { dummy: true, info: { containerId: "root" }, nodes: [] },
        snapshotId: "snap",
      });
      await lifecycleStore.loadWorkflow({
        projectId: "wf1",
        workflowId: "root:0:12",
      });

      await lifecycleStore.unloadActiveWorkflow({
        clearWorkflow: true,
      });

      expect(mockedAPI.event.unsubscribeEventListener).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: "wf1",
        workflowId: "root",
        snapshotId: "snap",
      });
      expect(workflowStore.activeWorkflow).toBeNull();
      expect(selectionStore.selectedConnections).toEqual({});
      expect(selectionStore.selectedNodes).toEqual({});
    });

    it("does not unload if there is no active workflow", async () => {
      const { lifecycleStore, workflowStore } = loadStore();
      workflowStore.activeWorkflow = null;
      await lifecycleStore.unloadActiveWorkflow({
        clearWorkflow: false,
      });

      expect(mockedAPI.event.unsubscribeEventListener).not.toHaveBeenCalled();
    });

    it("force closes projects on call", async () => {
      await loadStore().desktopInteractionsStore.forceCloseProjects({
        projectIds: ["projectTest1"],
      });

      expect(mockedAPI.desktop.forceCloseProjects).toHaveBeenCalledWith({
        projectIds: ["projectTest1"],
      });
    });

    it("switches from nothing to workflow", async () => {
      const busSpy = vi.fn();

      lifecycleBus.once("beforeLoadWorkflow", () =>
        busSpy("beforeLoadWorkflow"),
      );
      lifecycleBus.once("onWorkflowLoaded", () => busSpy("onWorkflowLoaded"));

      const {
        lifecycleStore,
        workflowStore,
        canvasStateTrackingStore,
        applicationStore,
      } = loadStore();
      workflowStore.activeWorkflow = null;

      canvasStateTrackingStore.setSavedCanvasStates({
        project: "1",
        workflow: "root",
        zoomFactor: 1,
      });

      await lifecycleStore.switchWorkflow({
        newWorkflow: { projectId: "1", workflowId: "root" },
      });

      expect(busSpy).toHaveBeenNthCalledWith(1, "beforeLoadWorkflow");
      expect(busSpy).toHaveBeenNthCalledWith(2, "onWorkflowLoaded");

      expect(lifecycleStore.setIsLoadingWorkflow).toHaveBeenCalledWith(true);
      expect(canvasStateTrackingStore.saveCanvasState).not.toHaveBeenCalled();
      expect(lifecycleStore.unloadActiveWorkflow).not.toHaveBeenCalled();

      expect(lifecycleStore.loadWorkflow).toHaveBeenCalledWith({
        projectId: "1",
        workflowId: "root",
      });
      expect(applicationStore.activeProjectId).toBe("1");
    });
  });

  describe("load workflows on navigation", () => {
    it("should unload workflows when leaving the worklow page", async () => {
      const router = getRouter();
      const { lifecycleStore } = loadStore();

      await lifecycleStore.initializeApplication({
        $router: router,
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      await router.push({ name: APP_ROUTES.Home.GetStarted });

      expect(lifecycleStore.switchWorkflow).toHaveBeenLastCalledWith({
        newWorkflow: null,
      });

      expect(lifecycleStore.setIsLoadingWorkflow).not.toHaveBeenLastCalledWith(
        true,
      );

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.Home.GetStarted);
    });

    it("should prevent navigation when auto-apply node configuration is cancelled", async () => {
      const router = getRouter();
      const { lifecycleStore, nodeConfigurationStore } = loadStore();

      vi.mocked(
        nodeConfigurationStore.autoApplySettings,
      ).mockImplementationOnce(() => Promise.resolve(false));

      await lifecycleStore.initializeApplication({
        $router: router,
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      await router.push({ name: APP_ROUTES.Home.GetStarted });

      expect(lifecycleStore.switchWorkflow).not.toHaveBeenCalledWith({
        newWorkflow: null,
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
    });

    it("should load a workflow when entering the worklow page", async () => {
      const router = getRouter();
      await router.push({
        name: APP_ROUTES.Home.GetStarted,
      });

      const { lifecycleStore } = loadStore();

      await lifecycleStore.initializeApplication({
        $router: router,
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      expect(lifecycleStore.switchWorkflow).toHaveBeenCalledWith({
        newWorkflow: { projectId: "foo", workflowId: "bar" },
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
    });
  });

  it("should hide the canvas anchored components when leaving the worklow page", async () => {
    const { canvasAnchoredComponentsStore, lifecycleStore } = loadStore();

    mockedAPI.desktop.getPersistedLocalStorageData.mockResolvedValue({});
    await lifecycleStore.initializeApplication({
      $router: router,
    });

    await router.push({
      name: APP_ROUTES.WorkflowPage,
      params: { projectId: "foo", workflowId: "bar" },
    });

    await router.push({ name: APP_ROUTES.Home.GetStarted });

    expect(
      canvasAnchoredComponentsStore.closeAllAnchoredMenus,
    ).toHaveBeenCalled();
  });
});
