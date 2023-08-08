import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { deepMocked } from "@/test/utils";
import { API } from "@api";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("workflow::moving", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should set the movePreviewDelta", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", {
      projectId: "bar",
      nodes: {
        "root:1": { id: "root:1", position: { x: 0, y: 0 } },
      },
    });

    const node = store.state.workflow.activeWorkflow.nodes["root:1"];
    store.commit("workflow/setMovePreview", { node, deltaX: 50, deltaY: 50 });
    expect(store.state.workflow.movePreviewDelta).toStrictEqual({
      x: 50,
      y: 50,
    });
  });

  it("should reset the position of the movePreviewDelta", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", {
      projectId: "bar",
      nodes: {
        "root:1": { id: "root:1", position: { x: 0, y: 0 } },
      },
    });

    const node = store.state.workflow.activeWorkflow.nodes["root:1"];
    store.commit("workflow/setMovePreview", { node, deltaX: 50, deltaY: 50 });
    expect(store.state.workflow.movePreviewDelta).toStrictEqual({
      x: 50,
      y: 50,
    });
    store.commit("workflow/resetMovePreview", { nodeId: node.id });
    expect(store.state.workflow.movePreviewDelta).toStrictEqual({
      x: 0,
      y: 0,
    });
  });

  it("should handle moving nodes and annotations", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", {
      projectId: "bar",
      nodes: {
        foo: { bla: 1, position: { x: 0, y: 0 } },
        bar: { qux: 2, position: { x: 50, y: 50 } },
      },
      workflowAnnotations: [
        { id: "id1", bounds: { x: 10, y: 10, width: 10, height: 10 } },
        { id: "id2", bounds: { x: 20, y: 20, width: 20, height: 20 } },
      ],
    });
    store.dispatch("selection/selectAllObjects");
    await nextTick();

    store.commit("workflow/setMovePreview", { deltaX: 50, deltaY: 50 });
    expect(store.state.workflow.movePreviewDelta).toStrictEqual({
      x: 50,
      y: 50,
    });
  });

  it("moves nodes and annotations", async () => {
    const { store } = await loadStore();
    store.commit("workflow/setActiveWorkflow", {
      projectId: "bar",
      nodes: {
        foo: { bla: 1, position: { x: 0, y: 0 } },
        bar: { qux: 2, position: { x: 50, y: 50 } },
      },
      workflowAnnotations: [
        { id: "id1", bounds: { x: 10, y: 10, width: 10, height: 10 } },
        { id: "id2", bounds: { x: 20, y: 20, width: 20, height: 20 } },
      ],
    });
    store.dispatch("selection/selectAllObjects");
    await nextTick();

    store.commit("workflow/setMovePreview", { deltaX: 50, deltaY: 50 });
    expect(store.state.workflow.movePreviewDelta).toStrictEqual({
      x: 50,
      y: 50,
    });
  });

  it.each([[1], [20]])(
    "should save position after move end for %s nodes and annotations",
    async (amount) => {
      const { store } = await loadStore();
      const nodesArray: Record<string, { id: string; position: any }> = {};
      for (let i = 0; i < amount; i++) {
        const name = `node-${i}`;
        nodesArray[name] = { position: { x: 0, y: 0 }, id: name };
      }
      const annotationsArray: Array<{ id: string; bounds: any }> = [];
      for (let i = 0; i < amount; i++) {
        const name = `annotation-${i}`;
        annotationsArray.push({
          bounds: { x: 10, y: 10, width: 10, height: 10 },
          id: name,
        });
      }

      store.commit("workflow/setActiveWorkflow", {
        projectId: "foo",
        nodes: nodesArray,
        info: {
          containerId: "test",
        },
        workflowAnnotations: annotationsArray,
      });
      await nextTick();
      const nodeIds = [];
      const annotationIds = [];
      Object.values(nodesArray).forEach((node) => {
        store.dispatch("selection/selectNode", node.id);
        nodeIds.push(node.id);
      });
      Object.values(annotationsArray).forEach((annotation) => {
        store.dispatch("selection/selectAnnotation", annotation.id);
        annotationIds.push(annotation.id);
      });

      store.commit("workflow/setMovePreview", { deltaX: 50, deltaY: 50 });
      await store.dispatch("workflow/moveObjects");

      expect(mockedAPI.workflowCommand.Translate).toHaveBeenNthCalledWith(1, {
        projectId: "foo",
        nodeIds,
        workflowId: "test",
        translation: { x: 50, y: 50 },
        annotationIds,
      });
    },
  );

  it("should skip moving objects if translation is 0", async () => {
    const { store } = await loadStore();

    store.commit("workflow/setIsDragging", true);
    store.commit("workflow/setMovePreview", { deltaX: 0, deltaY: 0 });
    store.commit("workflow/setActiveWorkflow", {
      projectId: "foo",
      nodes: {},
      info: {
        containerId: "test",
      },
      workflowAnnotations: [],
    });

    await store.dispatch("workflow/moveObjects");

    expect(store.state.workflow.isDragging).toBe(false);
    expect(mockedAPI.workflowCommand.Translate).not.toHaveBeenCalled();
  });
});
