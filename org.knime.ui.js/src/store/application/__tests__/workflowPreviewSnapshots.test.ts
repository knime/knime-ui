import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import type { useWorkflowPreviewSnapshotsStore } from "../workflowPreviewSnapshots";

import { loadStore } from "./loadStore";

vi.mock("@/util/encodeString", () => ({
  encodeString: vi.fn((value) => value),
}));

vi.mock("@/util/generateWorkflowPreview", () => ({
  generateWorkflowPreview: vi.fn((value) => value.outerHTML),
}));

const mockedAPI = deepMocked(API);

describe("workflow preview snapshot", () => {
  const getSnapshotKeys = (
    _store: ReturnType<typeof useWorkflowPreviewSnapshotsStore>,
  ) => Array.from(_store.rootWorkflowSnapshots.keys());

  describe("getActiveWorkflowSnapshot", () => {
    it("should get the active workflow snapshot when on the root level", async () => {
      const { workflowPreviewSnapshotsStore, canvasStore } = loadStore();

      const spy = vi.fn(() => ({ firstChild: {} }));
      // @ts-ignore
      canvasStore.getScrollContainerElement = spy;

      await workflowPreviewSnapshotsStore.getActiveWorkflowSnapshot();
      expect(spy).toHaveBeenCalled();
    });

    it("should get the active workflow snapshot when not on the root level", async () => {
      const { workflowStore, workflowPreviewSnapshotsStore } = loadStore();

      workflowStore.activeWorkflow!.projectId = "foo";
      workflowStore.activeWorkflow!.info.containerId = "root:17";

      workflowPreviewSnapshotsStore.rootWorkflowSnapshots.set(
        "foo--root",
        "<svg data-was-saved></svg>",
      );

      const result =
        await workflowPreviewSnapshotsStore.getActiveWorkflowSnapshot();
      expect(result).toBe("<svg data-was-saved></svg>");
    });
  });

  it("should save the current project snapshot when changing to a different project if current is unsaved", async () => {
    const { applicationStore, workflowStore, workflowPreviewSnapshotsStore } =
      loadStore();
    workflowStore.activeWorkflow!.dirty = true;

    applicationStore.setActiveProjectId("project1");
    const { activeProjectId } = applicationStore;
    expect(workflowPreviewSnapshotsStore.rootWorkflowSnapshots.size).toBe(0);

    workflowPreviewSnapshotsStore.updatePreviewSnapshot({
      isChangingProject: true,
      newWorkflow: {
        projectId: "bar",
      },
    });

    await flushPromises();

    expect(
      workflowPreviewSnapshotsStore.rootWorkflowSnapshots.get(
        `${activeProjectId}--root`,
      ),
    ).toBeDefined();
  });

  it("should update the workflow preview snapshots correctly (single project)", async () => {
    const {
      canvasStore,
      workflowStore,
      applicationStore,
      lifecycleStore,
      workflowPreviewSnapshotsStore,
    } = loadStore();

    const projectId = "project1";

    // create a dummy element to act as the workflow
    const canvasWrapperMockEl = document.createElement("div");
    canvasWrapperMockEl.scrollTo = vi.fn();
    const canvasMockEl = document.createElement("svg");
    canvasWrapperMockEl.appendChild(canvasMockEl);
    canvasStore.getScrollContainerElement = () => canvasWrapperMockEl;

    // setup activeWorkflow
    workflowStore.setActiveWorkflow(
      createWorkflow({
        info: { containerId: "root" },
        projectId,
        nodes: {},
        workflowAnnotations: [],
      }),
    );
    // setup projects
    applicationStore.setActiveProjectId(projectId);
    applicationStore.setOpenProjects([{ projectId, name: projectId }]);

    // switch to nested workflow on the same project
    await lifecycleStore.switchWorkflow({
      newWorkflow: { projectId, workflowId: "root:1" },
    });

    // should have saved 1 snapshot
    expect(getSnapshotKeys(workflowPreviewSnapshotsStore).length).toBe(1);
    expect(
      workflowPreviewSnapshotsStore.rootWorkflowSnapshots.get(
        getSnapshotKeys(workflowPreviewSnapshotsStore)[0],
      ),
    ).toBe("<svg></svg>");

    // go back to the root workflow
    await lifecycleStore.switchWorkflow({
      newWorkflow: { projectId, workflowId: "root" },
    });

    // should have cleared the snapshot
    expect(getSnapshotKeys(workflowPreviewSnapshotsStore).length).toBe(0);
  });

  it("should update the workflow preview snapshots correctly (multiple projects)", async () => {
    const {
      canvasStore,
      workflowStore,
      applicationStore,
      lifecycleStore,
      workflowPreviewSnapshotsStore,
    } = loadStore();

    mockedAPI.workflow.getWorkflow
      .mockResolvedValueOnce({
        workflow: {
          info: { containerId: "root:1" },
          nodes: [],
          workflowAnnotations: [],
        },
        snapshotId: "snap",
      })
      .mockResolvedValueOnce({
        workflow: {
          info: { containerId: "root" },
          nodes: [],
          workflowAnnotations: [],
        },
        snapshotId: "snap",
      });

    const project1 = "project1";
    const project2 = "project2";

    // create a dummy element to act as the workflow
    const canvasWrapperMockEl = document.createElement("div");
    const canvasMockEl = document.createElement("div");
    canvasWrapperMockEl.appendChild(canvasMockEl);

    // setup canvas
    canvasStore.getScrollContainerElement = () => canvasWrapperMockEl;

    // setup activeWorkflow
    workflowStore.setActiveWorkflow(
      createWorkflow({
        info: { containerId: "root" },
        projectId: project1,
        nodes: {},
        workflowAnnotations: [],
      }),
    );

    // setup projects
    applicationStore.setActiveProjectId(project1);
    applicationStore.setOpenProjects([
      { projectId: project1, name: project1 },
      { projectId: project2, name: project2 },
    ]);

    // first switch to nested workflow on project1
    await lifecycleStore.switchWorkflow({
      newWorkflow: { projectId: project1, workflowId: "root:1" },
    });

    // then switch to root workflow on project2
    await lifecycleStore.switchWorkflow({
      newWorkflow: { projectId: project2, workflowId: "root" },
    });

    // should have saved 1 snapshot (only from the 1st project)
    expect(getSnapshotKeys(workflowPreviewSnapshotsStore).length).toBe(1);

    // go into nested workflow on project 2
    await lifecycleStore.switchWorkflow({
      newWorkflow: { projectId: project2, workflowId: "root:2" },
    });

    // should have saved 2 snapshots, one for each project
    expect(getSnapshotKeys(workflowPreviewSnapshotsStore).length).toBe(2);
  });
});
