import { beforeAll, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

vi.mock("@/util/encoding", () => ({
  encodeString: vi.fn((value) => value),
}));

const mockedAPI = deepMocked(API);

describe("application::canvasStateTracking", () => {
  beforeAll(() => {
    mockedAPI.desktop.setProjectActiveAndEnsureItsLoaded.mockImplementation(
      () => true,
    );
  });

  it("sets saved states", () => {
    const { canvasStateTrackingStore } = loadStore();
    canvasStateTrackingStore.setSavedCanvasStates({
      zoomFactor: 1,
      scrollTop: 100,
      scrollLeft: 100,
      workflow: "root",
      project: "project1",
    });

    expect(canvasStateTrackingStore.savedCanvasStates).toStrictEqual({
      "project1--root": {
        children: {},
        project: "project1",
        scrollLeft: 100,
        scrollTop: 100,
        workflow: "root",
        zoomFactor: 1,
        lastActive: "root",
      },
    });
  });

  it("sets children in saved state", () => {
    const { canvasStateTrackingStore } = loadStore();
    canvasStateTrackingStore.setSavedCanvasStates({
      zoomFactor: 1,
      scrollTop: 100,
      scrollLeft: 100,
      workflow: "root:214",
      project: "project1",
    });

    expect(canvasStateTrackingStore.savedCanvasStates).toStrictEqual({
      "project1--root": {
        lastActive: "root:214",
        children: {
          "root:214": {
            project: "project1",
            scrollLeft: 100,
            scrollTop: 100,
            workflow: "root:214",
            zoomFactor: 1,
          },
        },
      },
    });
  });

  it("saves the canvas state", () => {
    const { canvasStateTrackingStore } = loadStore();
    expect(canvasStateTrackingStore.savedCanvasStates).toEqual({});
    canvasStateTrackingStore.saveCanvasState();

    expect(Object.keys(canvasStateTrackingStore.savedCanvasStates).length).toBe(
      1,
    );
    expect(
      canvasStateTrackingStore.savedCanvasStates["project1--root"],
    ).toBeTruthy();
  });

  it("restores canvas state", () => {
    const { canvasStateTrackingStore, canvasStore } = loadStore();
    canvasStateTrackingStore.setSavedCanvasStates({
      zoomFactor: 1,
      scrollTop: 100,
      scrollLeft: 100,
      scrollHeight: 1000,
      scrollWidth: 1000,
      workflow: "root",
      project: "project1",
    });

    canvasStateTrackingStore.restoreCanvasState();
    expect(canvasStore.restoreScrollState).toHaveBeenCalledWith(
      expect.objectContaining({
        zoomFactor: 1,
        scrollTop: 100,
        scrollLeft: 100,
        scrollHeight: 1000,
        scrollWidth: 1000,
      }),
    );
  });

  it("restores canvas state of a child", () => {
    const { workflowStore, canvasStateTrackingStore, canvasStore } =
      loadStore();

    workflowStore.setActiveWorkflow(
      createWorkflow({
        info: { containerId: "root:214" },
        projectId: "project1",
      }),
    );

    canvasStateTrackingStore.setSavedCanvasStates({
      zoomFactor: 1,
      scrollTop: 80,
      scrollLeft: 80,
      scrollHeight: 800,
      scrollWidth: 800,
      workflow: "root:214",
      project: "project1",
    });

    canvasStateTrackingStore.restoreCanvasState();
    expect(canvasStore.restoreScrollState).toHaveBeenCalledWith(
      expect.objectContaining({
        zoomFactor: 1,
        scrollTop: 80,
        scrollLeft: 80,
        scrollHeight: 800,
        scrollWidth: 800,
      }),
    );
  });

  it("removes canvas state", () => {
    const { canvasStateTrackingStore } = loadStore();
    canvasStateTrackingStore.saveCanvasState();
    expect(Object.keys(canvasStateTrackingStore.savedCanvasStates).length).toBe(
      1,
    );
    expect(
      canvasStateTrackingStore.savedCanvasStates["project1--root"],
    ).toBeTruthy();

    canvasStateTrackingStore.removeCanvasState("project1");
    expect(canvasStateTrackingStore.savedCanvasStates).toEqual({});
  });

  describe("lastActive", () => {
    it("switch from workflow to workflow and back", async () => {
      const { canvasStateTrackingStore, lifecycleStore, applicationStore } =
        loadStore();
      canvasStateTrackingStore.savedCanvasStates = {
        "1--root": {
          children: {},
          project: "1",
          workflow: "root",
          zoomFactor: 1,
          lastActive: "root:214",
        },
      };

      await lifecycleStore.switchWorkflow({
        newWorkflow: { projectId: "2", workflowId: "root" },
      });
      expect(applicationStore.activeProjectId).toBe("2");

      await lifecycleStore.switchWorkflow({
        newWorkflow: { projectId: "1", workflowId: "root" },
      });
      expect(lifecycleStore.loadWorkflow).toHaveBeenCalledWith({
        projectId: "1",
        workflowId: "root:214",
      });
      expect(applicationStore.activeProjectId).toBe("1");
    });

    it("restores `lastActive` workflow when switching projects", async () => {
      const { workflowStore, canvasStateTrackingStore, lifecycleStore } =
        loadStore();
      // start with a projectId 2
      workflowStore.setActiveWorkflow({
        projectId: "2",
        // @ts-expect-error
        info: { containerId: "root-1234" },
      });

      // make sure project 1 has a `lastActive` state
      canvasStateTrackingStore.savedCanvasStates = {
        "1--root": {
          children: {},
          project: "1",
          workflow: "root",
          zoomFactor: 1,
          lastActive: "root:214",
        },
      };

      // change to project 1
      await lifecycleStore.switchWorkflow({
        newWorkflow: { projectId: "1" },
      });

      // assert that project 1 was loaded and the correct `lastActive` was restored
      expect(lifecycleStore.loadWorkflow).toHaveBeenCalledWith({
        projectId: "1",
        workflowId: "root:214",
      });
    });
  });
});
