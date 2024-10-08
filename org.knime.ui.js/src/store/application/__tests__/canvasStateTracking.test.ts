import { describe, expect, it, vi } from "vitest";

import { loadStore } from "./loadStore";

vi.mock("@/util/encodeString", () => ({
  encodeString: vi.fn((value) => value),
}));

describe("application::canvasStateTracking", () => {
  const loadStoreWithWorkflow = () => {
    const { store, ...rest } = loadStore();

    store.commit("workflow/setActiveWorkflow", {
      info: { containerId: "root" },
      projectId: "project1",
    });

    return { store, ...rest };
  };

  it("sets saved states", () => {
    const { store } = loadStoreWithWorkflow();
    store.commit("application/setSavedCanvasStates", {
      zoomFactor: 1,
      scrollTop: 100,
      scrollLeft: 100,
      workflow: "root",
      project: "project1",
    });

    expect(store.state.application.savedCanvasStates).toStrictEqual({
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
    const { store } = loadStoreWithWorkflow();
    store.commit("application/setSavedCanvasStates", {
      zoomFactor: 1,
      scrollTop: 100,
      scrollLeft: 100,
      workflow: "root:214",
      project: "project1",
    });

    expect(store.state.application.savedCanvasStates).toStrictEqual({
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
    const { store, mockedGetters } = loadStoreWithWorkflow();
    expect(store.state.application.savedCanvasStates).toEqual({});
    store.dispatch("application/saveCanvasState");

    expect(mockedGetters.canvas.getCanvasScrollState).toHaveBeenCalled();
    expect(Object.keys(store.state.application.savedCanvasStates).length).toBe(
      1,
    );
    expect(
      store.state.application.savedCanvasStates["project1--root"],
    ).toBeTruthy();
  });

  it("restores canvas state", () => {
    const { store, mockedActions } = loadStoreWithWorkflow();
    store.commit("application/setSavedCanvasStates", {
      zoomFactor: 1,
      scrollTop: 100,
      scrollLeft: 100,
      scrollHeight: 1000,
      scrollWidth: 1000,
      workflow: "root",
      project: "project1",
    });

    store.dispatch("application/restoreCanvasState");
    expect(mockedActions.canvas.restoreScrollState).toHaveBeenCalledWith(
      expect.any(Object),
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
    const { store, mockedActions } = loadStoreWithWorkflow();
    store.state.workflow.activeWorkflow = {
      // @ts-expect-error
      info: { containerId: "root:214" },
      projectId: "project1",
    };

    store.commit("application/setSavedCanvasStates", {
      zoomFactor: 1,
      scrollTop: 80,
      scrollLeft: 80,
      scrollHeight: 800,
      scrollWidth: 800,
      workflow: "root:214",
      project: "project1",
    });

    store.dispatch("application/restoreCanvasState");
    expect(mockedActions.canvas.restoreScrollState).toHaveBeenCalledWith(
      expect.any(Object),
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
    const { store } = loadStoreWithWorkflow();
    store.dispatch("application/saveCanvasState");
    expect(Object.keys(store.state.application.savedCanvasStates).length).toBe(
      1,
    );
    expect(
      store.state.application.savedCanvasStates["project1--root"],
    ).toBeTruthy();

    store.dispatch("application/removeCanvasState", "project1");
    expect(store.state.application.savedCanvasStates).toEqual({});
  });

  describe("lastActive", () => {
    it("switch from workflow to workflow and back", async () => {
      const { store, dispatchSpy } = await loadStore();
      store.state.application.savedCanvasStates = {
        "1--root": {
          children: {},
          project: "1",
          workflow: "root",
          zoomFactor: 1,
          lastActive: "root:214",
        },
      };

      await store.dispatch("application/switchWorkflow", {
        newWorkflow: { projectId: "2", workflowId: "root" },
      });
      expect(store.state.application.activeProjectId).toBe("2");

      await store.dispatch("application/switchWorkflow", {
        newWorkflow: { projectId: "1", workflowId: "root" },
      });
      expect(dispatchSpy).toHaveBeenCalledWith("application/loadWorkflow", {
        projectId: "1",
        workflowId: "root:214",
      });
      expect(store.state.application.activeProjectId).toBe("1");
    });

    it("restores `lastActive` workflow when switching projects", async () => {
      const { store, dispatchSpy } = await loadStore();
      // start with a projectId 2
      store.state.workflow.activeWorkflow = {
        projectId: "2",
        // @ts-expect-error
        info: { containerId: "root-1234" },
      };

      // make sure project 1 has a `lastActive` state
      store.state.application.savedCanvasStates = {
        "1--root": {
          children: {},
          project: "1",
          workflow: "root",
          zoomFactor: 1,
          lastActive: "root:214",
        },
      };

      // change to project 1
      await store.dispatch("application/switchWorkflow", {
        newWorkflow: { projectId: "1" },
      });

      // assert that project 1 was loaded and the correct `lastActive` was restored
      expect(dispatchSpy).toHaveBeenCalledWith("application/loadWorkflow", {
        projectId: "1",
        workflowId: "root:214",
      });
    });
  });
});
