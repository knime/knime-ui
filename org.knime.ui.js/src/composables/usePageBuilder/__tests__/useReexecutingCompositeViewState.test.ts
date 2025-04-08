import { describe, expect, it } from "vitest";

import {
  createConnection,
  createNativeNode,
  createWorkflow,
  createWorkflowAnnotation,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { useReexecutingCompositeViewState } from "../useReexecutingCompositeViewState";

describe("useReexecutingCompositeViewState", () => {
  const createWorkflowContext = () => {
    const { workflowStore, selectionStore } = mockStores();

    const node1 = createNativeNode({ id: "root:1" });
    const node2 = createNativeNode({ id: "root:2" });
    const connection1 = createConnection({ id: "1_to_2" });
    const connection2 = createConnection({ id: "2_to_1" });
    const annotation1 = createWorkflowAnnotation({
      id: "anno1604",
      text: { value: "Annotation text" },
    });
    const annotation2 = createWorkflowAnnotation({
      id: "anno1603",
      text: { value: "Annotation text 2" },
    });

    workflowStore.activeWorkflow = createWorkflow({
      nodes: { [node1.id]: node1, [node2.id]: node2 },
      connections: {
        [connection1.id]: connection1,
        [connection2.id]: connection2,
      },
      workflowAnnotations: [annotation1, annotation2],
    });

    return {
      selectionStore,
      workflowStore,
      node1,
      node2,
      connection1,
      connection2,
      annotation1,
      annotation2,
    };
  };

  it("removes old node ID when single selection changes", async () => {
    const { selectionStore, node1 } = createWorkflowContext();

    const { addReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    await selectionStore.selectNodes([node1.id]);
    addReexecutingNode(node1.id);

    expect(isReexecuting(node1.id)).toBe(true);

    await selectionStore.deselectAllObjects();
    expect(isReexecuting(node1.id)).toBe(false);
  });

  it("handles multiple selections gracefully", async () => {
    const { selectionStore, node1, node2 } = createWorkflowContext();
    const { isReexecuting } = useReexecutingCompositeViewState();

    await selectionStore.selectNodes([node1.id, node2.id]);

    expect(isReexecuting("node1")).toBe(false);
    expect(isReexecuting("node2")).toBe(false);
  });

  it("adds node ID to reexecuting list", () => {
    const { node1 } = createWorkflowContext();
    const { addReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    const result = addReexecutingNode(node1.id);

    expect(result).toBe("added");
    expect(isReexecuting(node1.id)).toBe(true);
  });

  it("returns 'alreadyExists' when adding an existing node ID", () => {
    const { node1 } = createWorkflowContext();
    const { addReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    addReexecutingNode(node1.id);
    const result = addReexecutingNode(node1.id);

    expect(result).toBe("alreadyExists");
    expect(isReexecuting(node1.id)).toBe(true);
  });

  it("removes node ID from reexecuting list", () => {
    const { node1 } = createWorkflowContext();
    const { addReexecutingNode, removeReexecutingNode, isReexecuting } =
      useReexecutingCompositeViewState();

    addReexecutingNode(node1.id);
    removeReexecutingNode(node1.id);

    expect(isReexecuting(node1.id)).toBe(false);
  });
});
