import { afterEach, describe, expect, it, vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import { routes } from "@/router/router";
import { API } from "@/api";
import { deepMocked } from "@/test/utils";
import { applicationState, loadStore } from "./loadStore";

import { runInEnvironment } from "@/environment";
import { createWorkflow } from "@/test/factories";
import { lifecycleBus } from "../lifecycle-events";

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
      const { store, dispatchSpy, commitSpy, subscribeEvent } = loadStore();
      const exampleProjects = [{ name: "test" }];
      mockedAPI.desktop.getExampleProjects.mockResolvedValue(exampleProjects);
      await store.dispatch("application/initializeApplication", {
        $router: router,
      });

      expect(commitSpy).not.toHaveBeenCalledWith(
        "application/setIsLoadingApp",
        expect.anything(),
        undefined,
      );
      expect(subscribeEvent).toHaveBeenCalled();
      expect(API.application.getState).toHaveBeenCalled();
      expect(API.desktop.getExampleProjects).toHaveBeenCalled();
      expect(commitSpy).toHaveBeenCalledWith(
        "application/setExampleProjects",
        exampleProjects,
        undefined,
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/replaceApplicationState",
        applicationState,
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        "spaces/loadLocalSpace",
        expect.anything(),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        "spaces/fetchAllSpaceProviders",
        expect.anything(),
      );
      expect(dispatchSpy).toHaveBeenCalledWith("application/setActiveProject", {
        $router: router,
      });
    });

    it("initialization (BROWSER)", async () => {
      const router = getRouter();
      // @ts-ignore
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.BROWSER?.());

      const { store, dispatchSpy, commitSpy, subscribeEvent } = loadStore();
      await store.dispatch("application/initializeApplication", {
        $router: router,
      });

      expect(commitSpy).toHaveBeenCalledWith(
        "application/setIsLoadingApp",
        true,
        undefined,
      );

      expect(subscribeEvent).toHaveBeenCalled();
      expect(API.application.getState).toHaveBeenCalled();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "spaces/loadLocalSpace",
        expect.anything(),
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "spaces/fetchAllSpaceProviders",
        expect.anything(),
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/replaceApplicationState",
        applicationState,
      );
      expect(dispatchSpy).toHaveBeenCalledWith("application/setActiveProject", {
        $router: router,
      });
    });

    it("destroy application", async () => {
      const { store, dispatchSpy, unsubscribeEventListener } = loadStore();
      await store.dispatch("application/destroyApplication");

      expect(unsubscribeEventListener).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/unloadActiveWorkflow",
        { clearWorkflow: true },
      );
    });
  });

  describe("workflow Lifecycle", () => {
    it("loads root workflow successfully", async () => {
      const onWorkflowLoaded = vi.fn();

      lifecycleBus.once("onWorkflowLoaded", onWorkflowLoaded);

      const mockWorkflow = createWorkflow();
      const { store, loadWorkflow, subscribeEvent, dispatchSpy } = loadStore();

      expect(onWorkflowLoaded).not.toHaveBeenCalled();

      loadWorkflow.mockResolvedValue({
        workflow: mockWorkflow,
        snapshotId: "snap",
      });

      await store.dispatch("application/loadWorkflow", {
        projectId: mockWorkflow.projectId,
      });

      expect(onWorkflowLoaded).toHaveBeenCalled();

      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/beforeSetActivateWorkflow",
        { workflow: mockWorkflow },
      );

      expect(loadWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: mockWorkflow.info.containerId,
          projectId: mockWorkflow.projectId,
        }),
      );

      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/afterSetActivateWorkflow",
        undefined,
      );

      expect(
        deepMocked(API).desktop.setProjectActiveAndEnsureItsLoaded,
      ).toHaveBeenCalledWith({ projectId: mockWorkflow.projectId });
      expect(store.state.workflow.activeWorkflow).toStrictEqual(mockWorkflow);
      expect(store.state.workflow.activeSnapshotId).toBe("snap");
      expect(subscribeEvent).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: mockWorkflow.projectId,
        workflowId: mockWorkflow.info.containerId,
        snapshotId: "snap",
      });
    });

    it("loads inner workflow successfully", async () => {
      const { store, loadWorkflow, subscribeEvent } = loadStore();
      loadWorkflow.mockResolvedValue({
        workflow: { dummy: true, info: { containerId: "root" }, nodes: [] },
      });
      await store.dispatch("application/loadWorkflow", {
        projectId: "wf2",
        workflowId: "root:0:123",
      });

      expect(loadWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: "root:0:123", projectId: "wf2" }),
      );

      expect(store.state.workflow.activeWorkflow).toStrictEqual({
        dummy: true,
        info: { containerId: "root" },
        nodes: [],
        projectId: "wf2",
      });

      expect(subscribeEvent).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: "wf2",
        workflowId: "root",
      });
    });

    it("unloads workflow when another one is loaded", async () => {
      const { store, loadWorkflow, unsubscribeEventListener } = loadStore();
      loadWorkflow.mockResolvedValue({
        workflow: { dummy: true, info: { containerId: "root" }, nodes: [] },
        snapshotId: "snap",
      });
      await store.dispatch("application/loadWorkflow", {
        projectId: "wf1",
        workflowId: "root:0:12",
      });

      await store.dispatch("application/unloadActiveWorkflow", {
        clearWorkflow: true,
      });

      expect(unsubscribeEventListener).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: "wf1",
        workflowId: "root",
        snapshotId: "snap",
      });
      expect(store.state.workflow.activeWorkflow).toBeNull();
      expect(store.state.selection.selectedConnections).toEqual({});
      expect(store.state.selection.selectedNodes).toEqual({});
    });

    it("does not unload if there is no active workflow", async () => {
      const { store, unsubscribeEventListener } = loadStore();
      store.state.workflow.activeWorkflow = null;
      await store.dispatch("application/unloadActiveWorkflow", {
        clearWorkflow: false,
      });

      expect(unsubscribeEventListener).not.toHaveBeenCalled();
    });

    it("force closes projects on call", async () => {
      const { store } = loadStore();
      await store.dispatch("application/forceCloseProjects", {
        projectIds: ["projectTest1"],
        force: true,
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

      const { store, dispatchSpy, commitSpy } = loadStore();
      store.state.workflow.activeWorkflow = null;

      store.commit("application/setSavedCanvasStates", {
        project: "1",
        workflow: "root",
      });

      await store.dispatch("application/switchWorkflow", {
        newWorkflow: { projectId: "1", workflowId: "root" },
      });

      expect(busSpy).toHaveBeenNthCalledWith(1, "beforeLoadWorkflow");
      expect(busSpy).toHaveBeenNthCalledWith(2, "onWorkflowLoaded");

      expect(commitSpy).toHaveBeenCalledWith(
        "application/setIsLoadingWorkflow",
        true,
        undefined,
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "application/saveCanvasState",
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "workflow/unloadActiveWorkflow",
      );

      expect(dispatchSpy).toHaveBeenCalledWith("application/loadWorkflow", {
        projectId: "1",
        workflowId: "root",
      });
      expect(store.state.application.activeProjectId).toBe("1");
      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/restoreCanvasState",
        undefined,
      );
    });
  });

  describe("load workflows on navigation", () => {
    it("should unload workflows when leaving the worklow page", async () => {
      const router = getRouter();
      const { store, dispatchSpy, commitSpy } = loadStore();

      await store.dispatch("application/initializeApplication", {
        $router: router,
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      commitSpy.mockClear();
      await router.push({ name: APP_ROUTES.Home.GetStarted });

      expect(dispatchSpy).toHaveBeenCalledWith("application/switchWorkflow", {
        newWorkflow: null,
      });

      expect(commitSpy).not.toHaveBeenCalledWith(
        "application/setIsLoadingWorkflow",
        true,
        undefined,
      );

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.Home.GetStarted);
    });

    it("should prevent navigation when auto-apply node configuration is cancelled", async () => {
      const router = getRouter();
      const { store, dispatchSpy, commitSpy } = loadStore({
        autoApplySettingsMock: vi.fn(() => false),
      });

      await store.dispatch("application/initializeApplication", {
        $router: router,
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      commitSpy.mockClear();
      await router.push({ name: APP_ROUTES.Home.GetStarted });

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "application/switchWorkflow",
        {
          newWorkflow: null,
        },
      );

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
    });

    it("should load a workflow when entering the worklow page", async () => {
      const router = getRouter();
      await router.push({
        name: APP_ROUTES.Home.GetStarted,
      });

      const { store, dispatchSpy } = loadStore();

      await store.dispatch("application/initializeApplication", {
        $router: router,
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      expect(dispatchSpy).toHaveBeenCalledWith("application/switchWorkflow", {
        newWorkflow: { projectId: "foo", workflowId: "bar" },
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
    });
  });
});
