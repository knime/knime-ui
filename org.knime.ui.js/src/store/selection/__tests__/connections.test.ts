import { describe, expect, it } from "vitest";

import type { Workflow } from "@/api/gateway-api/generated-api";
import { createConnection, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";

describe("selection::connections", () => {
  const loadStore = () => {
    const mockedStores = mockStores();
    const workflow = createWorkflow();
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    return { ...mockedStores };
  };

  const getNthConnection = (workflow: Workflow, index: number) => {
    return Object.values(workflow.connections).at(index);
  };

  it("selects/deselects connections", () => {
    const { selectionStore, workflowStore } = loadStore();
    const conn1 = getNthConnection(workflowStore.activeWorkflow!, 0)!;
    const conn2 = getNthConnection(workflowStore.activeWorkflow!, 1)!;

    expect(selectionStore.isConnectionSelected(conn1.id)).toBe(false);
    expect(selectionStore.getSelectedConnections).toEqual([]);
    expect(selectionStore.selectedConnectionIds).toEqual([]);

    selectionStore.selectConnections([conn1.id, conn2.id]);

    expect(selectionStore.isConnectionSelected(conn1.id)).toBe(true);
    expect(selectionStore.getSelectedConnections).toEqual([conn1, conn2]);
    expect(selectionStore.selectedConnectionIds).toEqual([conn1.id, conn2.id]);

    selectionStore.deselectConnections([conn1.id, conn2.id]);

    expect(selectionStore.isConnectionSelected(conn1.id)).toBe(false);
    expect(selectionStore.getSelectedConnections).toEqual([]);
    expect(selectionStore.selectedConnectionIds).toEqual([]);
  });

  it("selects/deselects bendpoints", () => {
    const { selectionStore, workflowStore } = loadStore();
    const conn1 = getNthConnection(workflowStore.activeWorkflow!, 0)!;

    const bendpoint = { id: `${conn1.id}__0` };
    expect(selectionStore.isBendpointSelected(bendpoint.id)).toBe(false);
    expect(selectionStore.getSelectedBendpoints).toEqual({});

    selectionStore.selectBendpoints([bendpoint.id]);

    expect(selectionStore.isBendpointSelected(bendpoint.id)).toBe(true);
    expect(selectionStore.getSelectedBendpoints).toEqual({
      [conn1.id]: [0],
    });

    selectionStore.deselectBendpoints([bendpoint.id]);
    expect(selectionStore.isBendpointSelected(bendpoint.id)).toBe(false);
    expect(selectionStore.getSelectedBendpoints).toEqual({});
  });

  it("selects all bendpoints in a group of connections", () => {
    const { selectionStore } = loadStore();
    const conn1 = createConnection({
      id: "root:1_0",
      bendpoints: [
        { x: 10, y: 10 },
        { x: 15, y: 15 },
      ],
    });
    const conn2 = createConnection({
      id: "root:2_0",
      bendpoints: [{ x: 20, y: 20 }],
    });
    const conn3 = createConnection({
      id: "root:3_0",
      bendpoints: [
        { x: 30, y: 30 },
        { x: 35, y: 35 },
      ],
    });

    selectionStore.selectAllBendpointsInConnections([conn1, conn2, conn3]);
    expect(selectionStore.getSelectedBendpoints).toEqual({
      "root:1_0": [0, 1],
      "root:2_0": [0],
      "root:3_0": [0, 1],
    });
  });
});
