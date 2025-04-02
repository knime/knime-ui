import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { API } from "@api";

import { createNativeNode, createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

describe("workflow::moving", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should set the movePreviewDelta", () => {
    const { workflowStore, movingStore } = mockStores();
    workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId: "bar",
        nodes: {
          "root:1": createNativeNode({
            id: "root:1",
            position: { x: 0, y: 0 },
          }),
        },
      }),
    );

    movingStore.setMovePreview({ deltaX: 50, deltaY: 50 });
    expect(movingStore.movePreviewDelta).toStrictEqual({
      x: 50,
      y: 50,
    });
  });

  it("should reset the position of the movePreviewDelta", () => {
    const { workflowStore, movingStore } = mockStores();
    workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId: "bar",
        nodes: {
          "root:1": { id: "root:1", position: { x: 0, y: 0 } },
        },
      }),
    );

    movingStore.setMovePreview({ deltaX: 50, deltaY: 50 });
    expect(movingStore.movePreviewDelta).toStrictEqual({
      x: 50,
      y: 50,
    });
    movingStore.resetMovePreview();
    expect(movingStore.movePreviewDelta).toStrictEqual({
      x: 0,
      y: 0,
    });
  });

  it.each([[1], [20]])(
    "should save position after move end for %s nodes and annotations",
    async (amount) => {
      const { workflowStore, movingStore, selectionStore } = mockStores();
      const nodesRecords: Record<string, { id: string; position: any }> = {};
      for (let i = 0; i < amount; i++) {
        const name = `node-${i}`;
        nodesRecords[name] = { position: { x: 0, y: 0 }, id: name };
      }
      const annotationsArray: Array<{ id: string; bounds: any }> = [];
      for (let i = 0; i < amount; i++) {
        const name = `annotation-${i}`;
        annotationsArray.push({
          bounds: { x: 10, y: 10, width: 10, height: 10 },
          id: name,
        });
      }

      const annotationsArrayCopy: Array<{ id: string; bounds: any }> =
        JSON.parse(JSON.stringify(annotationsArray));
      const nodesRecordsCopy: Record<string, { id: string; position: any }> =
        JSON.parse(JSON.stringify(nodesRecords));

      workflowStore.setActiveWorkflow(
        createWorkflow({
          projectId: "foo",
          nodes: nodesRecords,
          info: {
            containerId: "test",
          },
          metaOutPorts: {
            bounds: {
              x: 0,
              y: 0,
            },
          },
          workflowAnnotations: annotationsArray,
        }),
      );
      await nextTick();
      const nodeIds: string[] = [];
      const annotationIds: string[] = [];
      Object.values(nodesRecords).forEach((node) => {
        selectionStore.selectNode(node.id);
        nodeIds.push(node.id);
      });
      Object.values(annotationsArray).forEach((annotation) => {
        selectionStore.selectAnnotation(annotation.id);
        annotationIds.push(annotation.id);
      });

      selectionStore.selectMetanodePortBar("out");

      movingStore.setMovePreview({ deltaX: 50, deltaY: 50 });
      await movingStore.moveObjects();

      // optimistic update
      expect(workflowStore.activeWorkflow!.workflowAnnotations).toStrictEqual(
        annotationsArrayCopy.map((annotation: any) => ({
          ...annotation,
          bounds: {
            ...annotation.bounds,
            x: annotation.bounds.x + 50,
            y: annotation.bounds.y + 50,
          },
        })),
      );

      expect(workflowStore.activeWorkflow!.nodes!).toStrictEqual(
        Object.fromEntries(
          Object.entries(nodesRecordsCopy).map(([key, value]) => [
            key,
            { ...value, position: { x: 50, y: 50 } },
          ]),
        ),
      );

      expect(workflowStore.activeWorkflow!.metaOutPorts!.bounds).toStrictEqual({
        x: 50,
        y: 50,
      });

      expect(mockedAPI.workflowCommand.Translate).toHaveBeenNthCalledWith(1, {
        projectId: "foo",
        nodeIds,
        workflowId: "test",
        translation: { x: 50, y: 50 },
        annotationIds,
        metanodeInPortsBar: false,
        metanodeOutPortsBar: true,
        connectionBendpoints: {},
      });
    },
  );

  it("should skip moving objects if translation is 0", async () => {
    const { workflowStore, movingStore } = mockStores();

    movingStore.setIsDragging(true);
    movingStore.setMovePreview({ deltaX: 0, deltaY: 0 });
    workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId: "foo",
        nodes: {},
        info: {
          containerId: "test",
        },
        workflowAnnotations: [],
      }),
    );

    await movingStore.moveObjects();

    expect(movingStore.isDragging).toBe(false);
    expect(mockedAPI.workflowCommand.Translate).not.toHaveBeenCalled();
  });
});
