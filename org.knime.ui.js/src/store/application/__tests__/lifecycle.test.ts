import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { watch } from "vue";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";
import { createRouter, createWebHistory } from "vue-router";

import { setupHints } from "@knime/components";
import { rfcErrors } from "@knime/hub-features";
import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";

import { isBrowser, isDesktop, runInEnvironment } from "@/environment";
import { APP_ROUTES } from "@/router/appRoutes";
import { router, routes } from "@/router/router";
import { getToastsProvider } from "@/plugins/toasts";
import { createWorkflow } from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { ProjectActivationError, ProjectDataLoadError } from "../lifecycle";
import { lifecycleBus } from "../lifecycle-events";

import { applicationState, loadStore } from "./loadStore";

vi.mock("@/components/workflowEditor/SVGKanvas/util/generateWorkflowPreview");
const mockedAPI = deepMocked(API);

vi.mock("@/environment");
vi.mock("@knime/hub-features", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    rfcErrors: {
      // @ts-expect-error
      ...actual.rfcErrors,
      toToast: vi.fn(),
    },
  };
});
vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    setupHints: vi.fn(),
  };
});

describe("application::lifecycle", () => {
  const getRouter = () => {
    return createRouter({
      history: createWebHistory(),
      routes,
    });
  };

  beforeEach(() => {
    mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded.mockImplementation(
      () => true,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("application Lifecycle", () => {
    it("initialization (DESKTOP)", async () => {
      const router = getRouter();

      // @ts-expect-error
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.DESKTOP?.());
      const { lifecycleStore, applicationStore, settingsStore } = loadStore();
      const exampleProjects = [{ name: "test" }];
      mockedAPI.desktop.getExampleProjects.mockResolvedValue(exampleProjects);
      await lifecycleStore.initializeApplication({
        $router: router,
      });

      expect(mockedAPI.desktop.waitForDesktopAPI).toHaveBeenCalledOnce();
      expect(settingsStore.fetchSettings).toHaveBeenCalled();
      expect(lifecycleStore.setIsLoadingApp).not.toHaveBeenCalled();
      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalled();
      expect(mockedAPI.application.getState).toHaveBeenCalled();
      expect(mockedAPI.desktop.getExampleProjects).toHaveBeenCalled();

      expect(lifecycleStore.populateHelpMenuAndExamples).toHaveBeenCalled();
      expect(applicationStore.exampleProjects).toEqual(exampleProjects);

      expect(applicationStore.replaceApplicationState).toHaveBeenCalledWith(
        applicationState,
      );

      expect(lifecycleStore.setActiveProject).toHaveBeenCalledWith({
        $router: router,
        isInitialization: true,
      });
      expect(setupHints).toHaveBeenCalled();
    });

    it("initialization (BROWSER)", async () => {
      const router = getRouter();
      // @ts-expect-error
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.BROWSER?.());

      const { lifecycleStore, applicationStore, spaceProvidersStore } =
        loadStore();

      await lifecycleStore.initializeApplication({ $router: router });
      expect(lifecycleStore.setIsLoadingApp).toHaveBeenCalledWith(true);
      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalled();
      expect(mockedAPI.application.getState).toHaveBeenCalled();
      expect(mockedAPI.desktop.getCustomHelpMenuEntries).not.toHaveBeenCalled();
      expect(mockedAPI.desktop.getExampleProjects).not.toHaveBeenCalled();
      expect(spaceProvidersStore.setAllSpaceProviders).toHaveBeenCalledWith(
        applicationState.spaceProviders,
      );

      expect(applicationStore.replaceApplicationState).toHaveBeenCalledWith(
        applicationState,
      );

      expect(lifecycleStore.setActiveProject).toHaveBeenCalledWith({
        $router: router,
        isInitialization: true,
      });
      expect(setupHints).toHaveBeenCalled();
    });

    it("shows load errors on initialization", async () => {
      const router = getRouter();
      const toast = mockedObject(getToastsProvider());

      // @ts-expect-error
      // eslint-disable-next-line new-cap
      runInEnvironment.mockImplementation((matcher) => matcher.BROWSER?.());
      mockEnvironment("BROWSER", { isBrowser, isDesktop });

      const loadErrors = {
        missingExtensions: [
          {
            name: "Foo Extension",
            vendor: "KNIME",
            nodeNames: ["Node A", "Node B"],
          },
        ],
        copyToClipboardContent: "copy text",
      };

      const stateWithErrors = {
        ...applicationState,
        openProjects: [
          {
            ...applicationState.openProjects[0],
            loadErrors,
          },
        ],
      };

      const { lifecycleStore } = loadStore();
      mockedAPI.application.getState.mockReturnValue(stateWithErrors);

      await lifecycleStore.initializeApplication({ $router: router });

      const expectedRfcError = new rfcErrors.RFCError({
        title: "1 missing extension",
        details: [
          "Extension 'Foo Extension' not installed (vendor: KNIME). Missing nodes: Node A, Node B",
        ],
      });

      expect(rfcErrors.toToast).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: "Errors while loading the workflow",
          rfcError: expectedRfcError,
          canCopyToClipboard: true,
          serializeErrorForClipboard: expect.any(Function),
        }),
      );

      expect(toast.show).toHaveBeenCalled();
    });

    it("destroy application", async () => {
      const { lifecycleStore } = loadStore();
      await lifecycleStore.destroyApplication();

      expect(mockedAPI.event.unsubscribeEventListener).toHaveBeenCalled();
      expect(lifecycleStore.unloadActiveWorkflow).toHaveBeenCalledWith({
        clearWorkflow: true,
      });
    });
  });

  describe("workflow Lifecycle", () => {
    beforeAll(() => {
      mockEnvironment("DESKTOP", { isBrowser, isDesktop });
    });

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
        versionId: CURRENT_STATE_VERSION,
      });

      expect(onWorkflowLoaded).toHaveBeenCalled();

      expect(lifecycleStore.beforeSetActivateWorkflow).toHaveBeenCalledWith({
        workflow: mockWorkflow,
      });

      expect(mockedAPI.workflow.getWorkflow).toHaveBeenCalledWith({
        workflowId: mockWorkflow.info.containerId,
        projectId: mockWorkflow.projectId,
        versionId: CURRENT_STATE_VERSION,
        includeInteractionInfo: true,
      });

      expect(lifecycleStore.afterSetActivateWorkflow).toHaveBeenCalled();

      expect(
        mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded,
      ).toHaveBeenCalledWith({
        projectId: mockWorkflow.projectId,
        versionId: CURRENT_STATE_VERSION,
        removeProjectIfNotLoaded: true,
      });
      expect(workflowStore.activeWorkflow).toStrictEqual(mockWorkflow);
      expect(workflowStore.activeSnapshotId).toBe("snap");
      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: mockWorkflow.projectId,
        workflowId: mockWorkflow.info.containerId,
        snapshotId: "snap",
      });
    });

    it("loads root workflow successfully if versionId is provided", async () => {
      const onWorkflowLoaded = vi.fn();
      lifecycleBus.once("onWorkflowLoaded", onWorkflowLoaded);

      const mockWorkflow = createWorkflow();
      const { lifecycleStore, workflowStore } = loadStore();

      mockedAPI.workflow.getWorkflow.mockResolvedValue({
        workflow: mockWorkflow,
        snapshotId: "snap",
      });

      const versionId = "version-id";
      await lifecycleStore.loadWorkflow({
        projectId: mockWorkflow.projectId,
        versionId,
      });

      expect(mockedAPI.workflow.getWorkflow).toHaveBeenCalledWith({
        workflowId: mockWorkflow.info.containerId,
        projectId: mockWorkflow.projectId,
        versionId,
        includeInteractionInfo: true,
      });

      expect(lifecycleStore.afterSetActivateWorkflow).toHaveBeenCalled();

      expect(
        mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded,
      ).toHaveBeenCalledWith({
        projectId: mockWorkflow.projectId,
        versionId,
        removeProjectIfNotLoaded: true,
      });
      expect(workflowStore.activeWorkflow).toStrictEqual(mockWorkflow);
      expect(workflowStore.activeSnapshotId).toBe("snap");
      expect(mockedAPI.event.subscribeEvent).toHaveBeenCalledWith({
        typeId: "WorkflowChangedEventType",
        projectId: mockWorkflow.projectId,
        workflowId: mockWorkflow.info.containerId,
        snapshotId: "snap",
      });
    });

    it("handles errors activating a root workflow", async () => {
      const onWorkflowLoaded = vi.fn();
      mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded.mockImplementation(
        () => false,
      );

      lifecycleBus.once("onWorkflowLoaded", onWorkflowLoaded);

      const mockWorkflow = createWorkflow();
      const { lifecycleStore } = loadStore();

      expect(onWorkflowLoaded).not.toHaveBeenCalled();

      await expect(() =>
        lifecycleStore.loadWorkflow({
          projectId: mockWorkflow.projectId,
        }),
      ).rejects.toBeInstanceOf(ProjectActivationError);

      expect(
        mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded,
      ).toHaveBeenCalledWith({
        projectId: mockWorkflow.projectId,
        versionId: CURRENT_STATE_VERSION,
        removeProjectIfNotLoaded: true,
      });
      expect(onWorkflowLoaded).not.toHaveBeenCalled();
      expect(mockedAPI.workflow.getWorkflow).not.toHaveBeenCalled();

      expect(lifecycleStore.afterSetActivateWorkflow).not.toHaveBeenCalled();
    });

    it("handles errors loading workflow data", async () => {
      const onWorkflowLoaded = vi.fn();
      mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded.mockImplementation(
        () => true,
      );

      lifecycleBus.once("onWorkflowLoaded", onWorkflowLoaded);

      const mockWorkflow = createWorkflow();
      const { lifecycleStore, workflowStore } = loadStore();

      const error = new Error("something wrong with the workflow data");
      mockedAPI.workflow.getWorkflow.mockRejectedValue(error);
      expect(onWorkflowLoaded).not.toHaveBeenCalled();

      await expect(() =>
        lifecycleStore.loadWorkflow({
          projectId: mockWorkflow.projectId,
          versionId: CURRENT_STATE_VERSION,
        }),
      ).rejects.toBeInstanceOf(ProjectDataLoadError);
      expect(workflowStore.setWorkflowLoadingError).toHaveBeenCalledWith(error);

      expect(
        mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded,
      ).toHaveBeenCalledWith({
        projectId: mockWorkflow.projectId,
        versionId: CURRENT_STATE_VERSION,
        removeProjectIfNotLoaded: true,
      });
      expect(onWorkflowLoaded).not.toHaveBeenCalled();
      expect(lifecycleStore.afterSetActivateWorkflow).not.toHaveBeenCalled();
    });

    it("loads inner workflow successfully", async () => {
      const { lifecycleStore, workflowStore } = loadStore();

      const loadedWF = createWorkflow({
        info: { containerId: "root" },
        nodes: Object.create({}),
        projectId: "wf2",
      });

      mockedAPI.workflow.getWorkflow.mockResolvedValue({ workflow: loadedWF });

      await lifecycleStore.loadWorkflow({
        projectId: "wf2",
        workflowId: "root:0:123",
      });

      expect(mockedAPI.workflow.getWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: "root:0:123", projectId: "wf2" }),
      );

      expect(workflowStore.activeWorkflow).toStrictEqual(loadedWF);
      expect(mockedAPI.event.subscribeEvent).not.toHaveBeenCalled();
    });

    it("unloads workflow when another one is loaded", async () => {
      const { lifecycleStore, workflowStore, selectionStore } = loadStore();
      const loadedWF = createWorkflow({
        info: { containerId: "root" },
        nodes: Object.create({}),
      });

      mockedAPI.workflow.getWorkflow.mockResolvedValue({
        workflow: loadedWF,
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
      expect(selectionStore.selectedConnectionIds).toEqual([]);
      expect(selectionStore.selectedNodeIds).toEqual([]);
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
    it("should unload workflows when leaving the workflow page", async () => {
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
      const { lifecycleStore, selectionStore } = loadStore();

      vi.mocked(selectionStore.tryClearSelection).mockImplementationOnce(() =>
        Promise.resolve({ wasAborted: true }),
      );

      await lifecycleStore.initializeApplication({
        $router: router,
      });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      await router.push({ name: APP_ROUTES.Home.GetStarted });
      await flushPromises();

      expect(lifecycleStore.switchWorkflow).not.toHaveBeenCalledWith({
        newWorkflow: null,
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
    });

    it("should load a workflow when entering the worklow page", async () => {
      const router = getRouter();
      await router.push({ name: APP_ROUTES.Home.GetStarted });

      const { lifecycleStore } = loadStore();

      await lifecycleStore.initializeApplication({ $router: router });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      expect(lifecycleStore.switchWorkflow).toHaveBeenCalledWith({
        newWorkflow: { projectId: "foo", workflowId: "bar" },
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
    });

    it("should set the pending navigation state when entering the worklow page", async () => {
      const router = getRouter();
      await router.push({ name: APP_ROUTES.Home.GetStarted });

      const { lifecycleStore } = loadStore();

      const stateSpy = vi.fn();
      watch(
        () => lifecycleStore.pendingWorkflowNavigation,
        (next) => stateSpy(next),
      );

      await lifecycleStore.initializeApplication({ $router: router });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "foo", workflowId: "bar" },
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
      expect(stateSpy).toHaveBeenNthCalledWith(1, {
        projectId: "foo",
        workflowId: "bar",
      });
      expect(stateSpy).toHaveBeenNthCalledWith(2, null);
    });

    it("should navigate to previous page when a ProjectActivationError occurs", async () => {
      await router.push({ name: APP_ROUTES.Home.GetStarted });
      const { lifecycleStore } = loadStore();

      await lifecycleStore.initializeApplication({ $router: router });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "project1", workflowId: "root" },
      });

      await flushPromises();
      expect(lifecycleStore.switchWorkflow).toHaveBeenCalledWith({
        newWorkflow: { projectId: "project1", workflowId: "root" },
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
      expect(router.currentRoute.value.params).toEqual({
        projectId: "project1",
        workflowId: "root",
      });

      vi.mocked(lifecycleStore.switchWorkflow).mockRejectedValueOnce(
        new ProjectActivationError("foo"),
      );

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "project2", workflowId: "root:12" },
      });

      expect(router.currentRoute.value.params).toEqual({
        projectId: "project1",
        workflowId: "root",
      });
    });

    it("should continue to workflow page when a ProjectDataLoadError occurs", async () => {
      await router.push({ name: APP_ROUTES.Home.GetStarted });
      const { lifecycleStore } = loadStore();

      await lifecycleStore.initializeApplication({ $router: router });

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "project1", workflowId: "root" },
      });

      await flushPromises();
      expect(lifecycleStore.switchWorkflow).toHaveBeenCalledWith({
        newWorkflow: { projectId: "project1", workflowId: "root" },
      });

      expect(router.currentRoute.value.name).toBe(APP_ROUTES.WorkflowPage);
      expect(router.currentRoute.value.params).toEqual({
        projectId: "project1",
        workflowId: "root",
      });

      vi.mocked(lifecycleStore.switchWorkflow).mockRejectedValueOnce(
        new ProjectDataLoadError(new Error("activation error")),
      );

      await router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "project2", workflowId: "root:12" },
      });

      expect(router.currentRoute.value.params).toEqual({
        projectId: "project2",
        workflowId: "root:12",
      });
    });
  });

  it("should hide the canvas anchored components when leaving the worklow page", async () => {
    const { canvasAnchoredComponentsStore, lifecycleStore } = loadStore();

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
