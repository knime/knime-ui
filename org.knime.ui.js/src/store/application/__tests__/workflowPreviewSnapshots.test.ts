import { describe, expect, it, vi } from "vitest";
import type { Store } from "vuex";

import type { RootStoreState } from "@/store/types";
import { loadStore } from "./loadStore";

vi.mock("@/util/encodeString", () => ({
  encodeString: vi.fn((value) => value),
}));

vi.mock("@/util/generateWorkflowPreview", () => ({
  generateWorkflowPreview: vi.fn((value) => value.outerHTML),
}));

describe("workflow preview snapshot", () => {
  const getSnapshotKeys = (_store: Store<RootStoreState>) =>
    Array.from(_store.state.application.rootWorkflowSnapshots.keys());

  describe("getActiveWorkflowSnapshot", () => {
    it("should get the active workflow snapshot when on the root level", async () => {
      const { store } = loadStore();

      await store.dispatch("application/getActiveWorkflowSnapshot");
      expect(store.state.canvas.getScrollContainerElement).toHaveBeenCalled();
    });

    it("should get the active workflow snapshot when not on the root level", async () => {
      const { store } = loadStore();

      store.state.workflow.activeWorkflow.info.containerId = "root:17";

      store.state.application.rootWorkflowSnapshots.set(
        "foo--root",
        "<svg data-was-saved></svg>",
      );

      const result = await store.dispatch(
        "application/getActiveWorkflowSnapshot",
      );
      expect(result).toBe("<svg data-was-saved></svg>");
    });
  });

  it("should save the current project snapshot when changing to a different project if current is unsaved", async () => {
    const { store } = loadStore();
    store.state.workflow.activeWorkflow.dirty = true;

    const { activeProjectId } = store.state.application;
    expect(store.state.application.rootWorkflowSnapshots.size).toBe(0);

    await store.dispatch("application/updatePreviewSnapshot", {
      isChangingProject: true,
      newWorkflow: {
        projectId: "bar",
      },
    });

    expect(
      store.state.application.rootWorkflowSnapshots.get(
        `${activeProjectId}--root`,
      ),
    ).toBeDefined();
  });

  it("should update the workflow preview snapshots correctly (single project)", async () => {
    const { store } = loadStore();

    const projectId = "project1";

    // create a dummy element to act as the workflow
    const canvasWrapperMockEl = document.createElement("div");
    const canvasMockEl = document.createElement("svg");
    canvasWrapperMockEl.appendChild(canvasMockEl);
    // setup canvas
    store.state.canvas = {
      getScrollContainerElement: () => canvasWrapperMockEl,
    };
    // setup activeWorkflow
    store.commit("workflow/setActiveWorkflow", {
      info: { containerId: "root" },
      projectId,
      nodes: {},
      workflowAnnotations: [],
    });
    // setup projects
    store.commit("application/setActiveProjectId", projectId);
    store.commit("application/setOpenProjects", [
      { projectId, name: projectId },
    ]);

    // switch to nested workflow on the same project
    await store.dispatch("application/switchWorkflow", {
      newWorkflow: { projectId, workflowId: "root:1" },
    });

    // should have saved 1 snapshot
    expect(getSnapshotKeys(store).length).toBe(1);
    expect(
      store.state.application.rootWorkflowSnapshots.get(
        getSnapshotKeys(store)[0],
      ),
    ).toBe("<svg></svg>");

    // go back to the root workflow
    await store.dispatch("application/switchWorkflow", {
      newWorkflow: { projectId, workflowId: "root" },
    });

    // should have cleared the snapshot
    expect(getSnapshotKeys(store).length).toBe(0);
  });

  it("should update the workflow preview snapshots correctly (multiple projects)", async () => {
    const { store, loadWorkflow } = loadStore();

    loadWorkflow
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
    store.state.canvas = {
      getScrollContainerElement: () => canvasWrapperMockEl,
    };

    // setup activeWorkflow
    store.commit("workflow/setActiveWorkflow", {
      info: { containerId: "root" },
      projectId: project1,
      nodes: {},
      workflowAnnotations: [],
    });

    // setup projects
    store.commit("application/setActiveProjectId", project1);
    store.commit("application/setOpenProjects", [
      { projectId: project1, name: project1 },
      { projectId: project2, name: project2 },
    ]);

    // first switch to nested workflow on project1
    await store.dispatch("application/switchWorkflow", {
      newWorkflow: { projectId: project1, workflowId: "root:1" },
    });

    // then switch to root workflow on project2
    await store.dispatch("application/switchWorkflow", {
      newWorkflow: { projectId: project2, workflowId: "root" },
    });

    // should have saved 1 snapshot (only from the 1st project)
    expect(getSnapshotKeys(store).length).toBe(1);

    // go into nested workflow on project 2
    await store.dispatch("application/switchWorkflow", {
      newWorkflow: { projectId: project2, workflowId: "root:2" },
    });

    // should have saved 2 snapshots, one for each project
    expect(getSnapshotKeys(store).length).toBe(2);
  });
});
