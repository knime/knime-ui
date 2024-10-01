import {
  expect,
  describe,
  it,
  vi,
  afterEach,
  type MockedFunction,
  type Mock,
} from "vitest";
import { deepMocked, mockVuexStore } from "@/test/utils";
import { generateWorkflowPreview } from "@/util/generateWorkflowPreview";
import { API } from "@/api";
import { getNextProjectId } from "../util";
import { createWorkflow } from "@/test/factories";

vi.mock("@/util/generateWorkflowPreview");
vi.mock("@/util/encodeString", () => ({
  encodeString: (value: string) => value,
}));

// mock the router import (which is a dependency of the application store) to prevent the test runner
// from creating a real router
vi.mock("@/router/appRoutes", () => ({
  APP_ROUTES: {},
}));

const mockedAPI = deepMocked(API);
const mockedGenerateWorkflowPreview = generateWorkflowPreview as MockedFunction<
  typeof generateWorkflowPreview
>;

describe("workflow store: desktop interactions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  type Options = { autoApplySettingsMock?: Mock<[], boolean> };

  const loadStore = async (options: Options = {}) => {
    const mockCanvasWrapperEl = document.createElement("div");
    const mockCanvasEl = document.createElement("div");
    mockCanvasWrapperEl.appendChild(mockCanvasEl);

    const autoApplySettingsMock =
      options.autoApplySettingsMock ?? vi.fn(() => true);

    const store = mockVuexStore({
      workflow: await import("@/store/workflow"),
      application: await import("@/store/application"),
      canvas: {
        state: {
          getScrollContainerElement: () => mockCanvasWrapperEl,
        },
      },
      spaces: {
        actions: {
          fetchWorkflowGroupContent: () => null,
        },
      },
      nodeConfiguration: {
        actions: {
          autoApplySettings: autoApplySettingsMock,
        },
      },
    });
    const dispatchSpy = vi.spyOn(store, "dispatch");

    return { store, dispatchSpy, mockCanvasEl, autoApplySettingsMock };
  };

  describe("actions", () => {
    it("calls executeNodeAndOpenView from API", async () => {
      const { store } = await loadStore();
      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ projectId: "foo" }),
      );
      store.dispatch("workflow/executeNodeAndOpenView", "root:0");

      expect(mockedAPI.desktop.executeNodeAndOpenView).toHaveBeenCalledWith({
        nodeId: "root:0",
        projectId: "foo",
      });
    });

    it("calls openNodeDialog from API", async () => {
      const { store } = await loadStore();

      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ projectId: "foo" }),
      );
      store.dispatch("workflow/openNodeConfiguration", "node x");

      expect(mockedAPI.desktop.openNodeDialog).toHaveBeenCalledWith({
        nodeId: "node x",
        projectId: "foo",
      });
    });

    it("calls openFlowVariableConfiguration from API", async () => {
      const { store } = await loadStore();

      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({ projectId: "foo" }),
      );
      store.dispatch("workflow/openFlowVariableConfiguration", "node x");

      expect(
        mockedAPI.desktop.openLegacyFlowVariableDialog,
      ).toHaveBeenCalledWith({
        nodeId: "node x",
        projectId: "foo",
      });
    });

    it("calls openLayoutEditor from API", async () => {
      const { store } = await loadStore();

      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );
      store.dispatch("workflow/openLayoutEditor");

      expect(mockedAPI.desktop.openLayoutEditor).toHaveBeenCalledWith({
        projectId: "foo",
        workflowId: "root",
      });
    });

    it("calls openLayoutEditor from API with nodeId", async () => {
      const { store } = await loadStore();
      const nodeId = "nodeId1";

      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );
      store.dispatch("workflow/openLayoutEditorByNodeId", { nodeId });

      expect(mockedAPI.desktop.openLayoutEditor).toHaveBeenCalledWith({
        projectId: "foo",
        workflowId: nodeId,
      });
    });

    describe("save workflow", () => {
      it("saves the workflow via the API", async () => {
        const { store } = await loadStore();

        store.commit(
          "workflow/setActiveWorkflow",
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await store.dispatch("workflow/saveProject");

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
          expect.objectContaining({ projectId: "foo" }),
        );
      });

      it("sends the correct workflow preview for a root workflow", async () => {
        const { store } = await loadStore();

        mockedGenerateWorkflowPreview.mockResolvedValue("mock svg preview");

        store.commit(
          "workflow/setActiveWorkflow",
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await store.dispatch("workflow/saveProject");

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowPreviewSvg: "mock svg preview",
          }),
        );
      });

      it("sends the correct workflow preview for a nested workflow", async () => {
        const { store } = await loadStore();

        const projectId = "project1";
        // 'root:1' to mimic being inside component/metanode
        const workflowId = "root:1";
        // set the snapshot on the store
        const dummyEl = document.createElement("div");
        store.state.application.rootWorkflowSnapshots.set(
          `${projectId}--root`,
          dummyEl.outerHTML,
        );

        mockedGenerateWorkflowPreview.mockImplementation((input) =>
          Promise.resolve(input.outerHTML),
        );

        store.commit(
          "workflow/setActiveWorkflow",
          createWorkflow({
            projectId,
            info: { containerId: workflowId },
          }),
        );

        await store.dispatch("workflow/saveProject");

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowPreviewSvg: dummyEl.outerHTML,
          }),
        );
      });
    });

    describe("close workflow", () => {
      it("closes correctly when single project is opened", async () => {
        mockedAPI.desktop.closeProject.mockImplementation(() => true);

        const openProjects = [
          { name: "Mock project 1", projectId: "Mock project 1" },
        ];
        const { projectId: activeProjectId } = openProjects[0];
        const { projectId: closingProjectId } = openProjects[0];

        // setup
        const { store, dispatchSpy } = await loadStore();
        store.commit("application/setOpenProjects", openProjects);
        store.commit("application/setActiveProjectId", activeProjectId);
        store.commit(
          "workflow/setActiveWorkflow",
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await store.dispatch("workflow/closeProject", closingProjectId);
        expect(mockedAPI.desktop.closeProject).toHaveBeenCalledWith({
          closingProjectId,
          nextProjectId: null,
        });
        expect(dispatchSpy).toHaveBeenCalledWith(
          "application/removeFromRootWorkflowSnapshots",
          {
            projectId: closingProjectId,
          },
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "application/removeCanvasState",
          closingProjectId,
        );
        expect(dispatchSpy).toHaveBeenCalledWith(
          "workflow/clearProcessedUpdateNotification",
          { projectId: closingProjectId },
        );
      });

      it("should prevent closing when auto-apply node configuration cancels", async () => {
        mockedAPI.desktop.closeProject.mockImplementation(() => true);

        const openProjects = [
          { name: "Mock project 1", projectId: "Mock project 1" },
        ];
        const { projectId: activeProjectId } = openProjects[0];
        const { projectId: closingProjectId } = openProjects[0];

        // setup
        const { store, dispatchSpy } = await loadStore({
          autoApplySettingsMock: vi.fn(() => false),
        });
        store.commit("application/setOpenProjects", openProjects);
        store.commit("application/setActiveProjectId", activeProjectId);
        store.commit(
          "workflow/setActiveWorkflow",
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await store.dispatch("workflow/closeProject", closingProjectId);
        expect(mockedAPI.desktop.closeProject).not.toHaveBeenCalled();
        expect(dispatchSpy).toHaveBeenCalledWith(
          "nodeConfiguration/autoApplySettings",
          expect.anything(),
        );
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "application/removeCanvasState",
          closingProjectId,
        );
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "workflow/clearProcessedUpdateNotification",
          { projectId: closingProjectId },
        );
      });

      it.each([
        [
          'keep "active project" unchanged if closing a non-active project',
          { activeProject: 1, closingProject: 0, expectedNextProject: 1 },
        ],
        [
          'set the next project active if the "active project" is closed AND it\'s not the last in the list',
          { activeProject: 1, closingProject: 1, expectedNextProject: 2 },
        ],
        [
          'set the previous project active if the "active project" is closed AND it\'s the last in the list',
          { activeProject: 2, closingProject: 2, expectedNextProject: 1 },
        ],
      ])(
        "should %s",
        async (_, { activeProject, closingProject, expectedNextProject }) => {
          mockedAPI.desktop.closeProject.mockImplementation(() => true);

          const openProjects = [
            { name: "Mock project 1", projectId: "Mock project 1" },
            { name: "Mock project 2", projectId: "Mock project 2" },
            { name: "Mock project 3", projectId: "Mock project 3" },
          ];
          const { projectId: activeProjectId } = openProjects[activeProject];
          const { projectId: closingProjectId } = openProjects[closingProject];
          const { projectId: expectedNextProjectId } =
            openProjects[expectedNextProject];

          // setup
          const { store, dispatchSpy } = await loadStore();
          store.commit("application/setOpenProjects", openProjects);
          store.commit("application/setActiveProjectId", activeProjectId);
          store.commit(
            "workflow/setActiveWorkflow",
            createWorkflow({
              projectId: "foo",
              info: { containerId: "root" },
            }),
          );

          await store.dispatch("workflow/closeProject", closingProjectId);
          expect(mockedAPI.desktop.closeProject).toHaveBeenCalledWith({
            closingProjectId,
            nextProjectId: expectedNextProjectId,
          });
          expect(dispatchSpy).toHaveBeenCalledWith(
            "application/removeCanvasState",
            closingProjectId,
          );
        },
      );

      it("does not remove canvasState nor workflowPreviewSnapshot if closeProject is cancelled", async () => {
        mockedAPI.desktop.closeProject.mockImplementation(() => false);
        const { store, dispatchSpy } = await loadStore();

        await store.dispatch("workflow/closeProject", "foo");

        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "application/removeRootWorkflowSnapshot",
        );
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          "application/removeCanvasState",
          "foo",
        );
      });
    });
  });

  describe("save workflow locally", () => {
    it("saves the workflow locally via the API", async () => {
      const { store } = await loadStore();

      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      await store.dispatch("workflow/saveProjectAs");

      expect(mockedAPI.desktop.saveProjectAs).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "foo" }),
      );
    });

    it("sends the correct workflow preview for a root workflow when saved locally", async () => {
      const { store } = await loadStore();

      mockedGenerateWorkflowPreview.mockResolvedValue("mock svg preview");

      store.commit(
        "workflow/setActiveWorkflow",
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      await store.dispatch("workflow/saveProjectAs");

      expect(mockedAPI.desktop.saveProjectAs).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowPreviewSvg: "mock svg preview",
        }),
      );
    });
  });

  describe("utils", () => {
    it("determines next project id correctly", () => {
      const closingProjectIds = ["test1", "test2", "test3"];
      const activeProjectId = "test1";
      const openProjects = [
        { projectId: "test1" },
        { projectId: "test2" },
        { projectId: "test4" },
      ];
      const nextProjectId = getNextProjectId({
        closingProjectIds,
        activeProjectId,
        openProjects,
      });
      expect(nextProjectId).toBe("test4");
    });
  });
});
