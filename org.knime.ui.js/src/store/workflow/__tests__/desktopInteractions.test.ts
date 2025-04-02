import {
  type MockedFunction,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { API } from "@api";

import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { generateWorkflowPreview } from "@/util/generateWorkflowPreview";

vi.mock("@/util/generateWorkflowPreview");
vi.mock("@/util/encodeString", () => ({
  encodeString: (value: string) => value,
}));

const mockedAPI = deepMocked(API);
const mockedGenerateWorkflowPreview = generateWorkflowPreview as MockedFunction<
  typeof generateWorkflowPreview
>;

describe("workflow store: desktop interactions", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockedGenerateWorkflowPreview.mockReset();
  });

  describe("actions", () => {
    it("calls executeNodeAndOpenView from API", () => {
      const { workflowStore, executionStore } = mockStores();
      workflowStore.setActiveWorkflow(createWorkflow({ projectId: "foo" }));
      executionStore.executeNodeAndOpenView("root:0");

      expect(mockedAPI.desktop.executeNodeAndOpenView).toHaveBeenCalledWith({
        nodeId: "root:0",
        projectId: "foo",
      });
    });

    it("calls openNodeDialog from API", () => {
      const { workflowStore, desktopInteractionsStore } = mockStores();

      workflowStore.setActiveWorkflow(createWorkflow({ projectId: "foo" }));
      desktopInteractionsStore.openNodeConfiguration("node x");

      expect(mockedAPI.desktop.openNodeDialog).toHaveBeenCalledWith({
        nodeId: "node x",
        projectId: "foo",
      });
    });

    it("calls openNodeDialog from API and update if node settings have changed", async () => {
      mockedAPI.desktop.openNodeDialog.mockImplementation(() =>
        Promise.resolve(true),
      );

      const {
        workflowStore,
        desktopInteractionsStore,
        nodeConfigurationStore,
        selectionStore,
      } = mockStores();

      selectionStore.selectNode("root:1");
      workflowStore.setActiveWorkflow(createWorkflow({ projectId: "foo" }));
      await desktopInteractionsStore.openNodeConfiguration("node x");

      expect(mockedAPI.desktop.openNodeDialog).toHaveBeenCalledWith({
        nodeId: "node x",
        projectId: "foo",
      });
      expect(nodeConfigurationStore.updateTimestamp).toHaveBeenCalled();
    });

    it("calls openFlowVariableConfiguration from API", async () => {
      const { workflowStore, desktopInteractionsStore } = await mockStores();

      workflowStore.setActiveWorkflow(createWorkflow({ projectId: "foo" }));
      desktopInteractionsStore.openFlowVariableConfiguration("node x");

      expect(
        mockedAPI.desktop.openLegacyFlowVariableDialog,
      ).toHaveBeenCalledWith({
        nodeId: "node x",
        projectId: "foo",
      });
    });

    it("calls openLayoutEditor from API", async () => {
      const { workflowStore, desktopInteractionsStore } = await mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );
      desktopInteractionsStore.openLayoutEditor();

      expect(mockedAPI.desktop.openLayoutEditor).toHaveBeenCalledWith({
        projectId: "foo",
        workflowId: "root",
      });
    });

    it("calls openLayoutEditor from API with nodeId", async () => {
      const { workflowStore, desktopInteractionsStore } = await mockStores();
      const nodeId = "nodeId1";

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );
      desktopInteractionsStore.openLayoutEditorByNodeId({ nodeId });

      expect(mockedAPI.desktop.openLayoutEditor).toHaveBeenCalledWith({
        projectId: "foo",
        workflowId: nodeId,
      });
    });

    describe("save workflow", () => {
      it("saves the workflow via the API", async () => {
        const { workflowStore, desktopInteractionsStore } = mockStores();

        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await desktopInteractionsStore.saveProject();

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
          expect.objectContaining({ projectId: "foo" }),
        );
      });

      it("sends the correct workflow preview for a root workflow", async () => {
        const { workflowStore, desktopInteractionsStore } = mockStores();

        mockedGenerateWorkflowPreview.mockResolvedValue("mock svg preview");

        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await desktopInteractionsStore.saveProject();

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
          expect.objectContaining({
            workflowPreviewSvg: "mock svg preview",
          }),
        );
      });

      it("sends the correct workflow preview for a nested workflow", async () => {
        const {
          workflowStore,
          desktopInteractionsStore,
          workflowPreviewSnapshotsStore,
        } = mockStores();

        const projectId = "project1";
        // 'root:1' to mimic being inside component/metanode
        const workflowId = "root:1";
        // set the snapshot on the store
        const dummyEl = document.createElement("div");
        workflowPreviewSnapshotsStore.rootWorkflowSnapshots.set(
          `${projectId}--root`,
          dummyEl.outerHTML,
        );

        mockedGenerateWorkflowPreview.mockImplementation((input) =>
          Promise.resolve(input.outerHTML),
        );

        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId,
            info: { containerId: workflowId },
          }),
        );

        await desktopInteractionsStore.saveProject();

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

        const {
          workflowStore,
          applicationStore,
          desktopInteractionsStore,
          workflowPreviewSnapshotsStore,
          canvasStateTrackingStore,
          componentInteractionsStore,
        } = mockStores();
        applicationStore.setOpenProjects(openProjects);
        applicationStore.setActiveProjectId(activeProjectId);

        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await desktopInteractionsStore.closeProject(closingProjectId);
        expect(mockedAPI.desktop.closeProject).toHaveBeenCalledWith({
          closingProjectId,
          nextProjectId: null,
        });
        expect(
          workflowPreviewSnapshotsStore.removeFromRootWorkflowSnapshots,
        ).toHaveBeenCalledWith({
          projectId: closingProjectId,
        });
        expect(canvasStateTrackingStore.removeCanvasState).toHaveBeenCalledWith(
          closingProjectId,
        );
        expect(
          componentInteractionsStore.clearProcessedUpdateNotification,
        ).toHaveBeenCalledWith({
          projectId: closingProjectId,
        });
      });

      it("should prevent closing when auto-apply node configuration cancels", async () => {
        mockedAPI.desktop.closeProject.mockImplementation(() => true);

        const openProjects = [
          { name: "Mock project 1", projectId: "Mock project 1" },
        ];
        const { projectId: activeProjectId } = openProjects[0];
        const { projectId: closingProjectId } = openProjects[0];

        // setup
        const {
          workflowStore,
          applicationStore,
          desktopInteractionsStore,
          nodeConfigurationStore,
          canvasStateTrackingStore,
          componentInteractionsStore,
        } = mockStores();

        vi.mocked(nodeConfigurationStore.autoApplySettings).mockImplementation(
          () => Promise.resolve(false),
        );

        applicationStore.setOpenProjects(openProjects);
        applicationStore.setActiveProjectId(activeProjectId);
        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await desktopInteractionsStore.closeProject(closingProjectId);
        expect(mockedAPI.desktop.closeProject).not.toHaveBeenCalled();
        expect(nodeConfigurationStore.autoApplySettings).toHaveBeenCalledWith(
          expect.anything(),
        );
        expect(
          canvasStateTrackingStore.removeCanvasState,
        ).not.toHaveBeenCalledWith(closingProjectId);
        expect(
          componentInteractionsStore.clearProcessedUpdateNotification,
        ).not.toHaveBeenCalledWith(
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
          const {
            workflowStore,
            applicationStore,
            desktopInteractionsStore,
            canvasStateTrackingStore,
          } = mockStores();

          applicationStore.setOpenProjects(openProjects);
          applicationStore.setActiveProjectId(activeProjectId);
          workflowStore.setActiveWorkflow(
            createWorkflow({
              projectId: "foo",
              info: { containerId: "root" },
            }),
          );

          await desktopInteractionsStore.closeProject(closingProjectId);
          expect(mockedAPI.desktop.closeProject).toHaveBeenCalledWith({
            closingProjectId,
            nextProjectId: expectedNextProjectId,
          });
          expect(
            canvasStateTrackingStore.removeCanvasState,
          ).toHaveBeenCalledWith(closingProjectId);
        },
      );

      it("does not remove canvasState nor workflowPreviewSnapshot if closeProject is cancelled", async () => {
        mockedAPI.desktop.closeProject.mockImplementation(() => false);
        const { canvasStateTrackingStore, desktopInteractionsStore } =
          mockStores();

        await desktopInteractionsStore.closeProject("foo");

        expect(
          canvasStateTrackingStore.removeCanvasState,
        ).not.toHaveBeenCalledWith("foo");
      });
    });
  });

  it("force close projects calls forceCloseProjects via the API", async () => {
    mockedAPI.desktop.forceCloseProjects.mockImplementation(() => null);
    const closingProjectIds = { projectIds: ["someProjectId"] };

    await mockStores().desktopInteractionsStore.forceCloseProjects(
      closingProjectIds,
    );

    expect(mockedAPI.desktop.forceCloseProjects).toHaveBeenCalledWith(
      closingProjectIds,
    );
  });

  describe("save workflow locally", () => {
    it("saves the workflow locally via the API", async () => {
      const { workflowStore, desktopInteractionsStore } = mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      await desktopInteractionsStore.saveProjectAs();

      expect(mockedAPI.desktop.saveProjectAs).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "foo" }),
      );
    });

    it("sends the correct workflow preview for a root workflow when saved locally", async () => {
      const { workflowStore, desktopInteractionsStore } = mockStores();

      mockedGenerateWorkflowPreview.mockResolvedValue("mock svg preview");

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      await desktopInteractionsStore.saveProjectAs();

      expect(mockedAPI.desktop.saveProjectAs).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowPreviewSvg: "mock svg preview",
        }),
      );
    });
  });
});
