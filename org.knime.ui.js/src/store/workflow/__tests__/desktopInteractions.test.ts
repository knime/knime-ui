import { afterEach, describe, expect, it, vi } from "vitest";
import { useEventBus } from "@vueuse/core";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";

import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

vi.mock("@/util/encodeString", () => ({
  encodeString: (value: string) => value,
}));

const mockedAPI = deepMocked(API);

const emitSpy = vi.fn();
vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useEventBus: vi.fn(() => ({
      emit: emitSpy,
      on: vi.fn(),
      off: vi.fn(),
    })),
  };
});

describe("workflow store: desktop interactions", () => {
  afterEach(() => {
    vi.clearAllMocks();
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

    describe("calls openNodeDialog from API", () => {
      const projectId = "project-id";
      const nodeId = "node-id";

      it("with current version if no versionId is provided", () => {
        mockedAPI.desktop.openNodeDialog.mockReturnValue(
          Promise.resolve(false),
        ); // resolve with false (no setting change) to prevent triggering extra store actions
        const { workflowStore, desktopInteractionsStore } = mockStores();
        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId,
            info: {},
          }),
        );

        desktopInteractionsStore.openNodeConfiguration(nodeId);

        expect(mockedAPI.desktop.openNodeDialog).toHaveBeenCalledWith({
          projectId,
          versionId: CURRENT_STATE_VERSION,
          nodeId,
        });
      });
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

    describe("save workflow", () => {
      mockedAPI.desktop.saveProject.mockResolvedValue(true);

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

        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId: "foo",
            info: { containerId: "root" },
          }),
        );

        await desktopInteractionsStore.saveProject();

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: "foo",
          }),
        );
      });

      it("sends the correct workflow preview for a nested workflow", async () => {
        const { workflowStore, desktopInteractionsStore } = mockStores();

        const projectId = "project1";
        // 'root:1' to mimic being inside component/metanode
        const workflowId = "root:1";
        workflowStore.setActiveWorkflow(
          createWorkflow({
            projectId,
            info: { containerId: workflowId },
          }),
        );

        await desktopInteractionsStore.saveProject();

        expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: "project1",
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
        expect(nodeConfigurationStore.autoApplySettings).toHaveBeenCalled();
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

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      await desktopInteractionsStore.saveProjectAs();

      expect(mockedAPI.desktop.saveProjectAs).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "foo",
        }),
      );
    });
  });

  describe("saveProject event emission", () => {
    it("should emit workflow-saved event after successful save", async () => {
      const { desktopInteractionsStore, workflowStore } = mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      mockedAPI.desktop.saveProject.mockResolvedValue(true);

      await desktopInteractionsStore.saveProject();

      expect(mockedAPI.desktop.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "foo" }),
      );

      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it("should NOT emit workflow-saved event if save fails", async () => {
      const { desktopInteractionsStore, workflowStore } = mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      const workflowSavedBus = useEventBus("workflow-saved");
      const emitSpy = vi.spyOn(workflowSavedBus, "emit");

      mockedAPI.desktop.saveProject.mockRejectedValue(new Error("Save failed"));

      await expect(
        desktopInteractionsStore.saveProject(),
      ).rejects.toThrowError();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it("should NOT emit workflow-saved event if save is aborted (result === false)", async () => {
      const { desktopInteractionsStore, workflowStore } = mockStores();

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          info: { containerId: "root" },
        }),
      );

      mockedAPI.desktop.saveProject.mockResolvedValue(false);

      await desktopInteractionsStore.saveProject();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
