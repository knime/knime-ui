import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import { createNativeNode, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useConnectorCulling } from "../useConnectorCulling";

describe("useConnectorCulling", () => {
  it("should be culled when outside view", async () => {
    const mockedStores = mockStores();

    // @ts-expect-error
    mockedStores.webglCanvasStore.visibleArea = {
      x: 0,
      y: 0,
      width: 500,
      height: 500,
    };

    const node1 = createNativeNode({
      id: "root:1",
      position: { x: 10, y: 20 },
    });
    const node2 = createNativeNode({
      id: "root:2",
      position: { x: 40, y: 60 },
    });
    const workflow = createWorkflow({
      nodes: {
        [node1.id]: node1,
        [node2.id]: node2,
      },
    });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    const { getComposableResult } = mountComposable({
      composable: useConnectorCulling,
      composableProps: {
        sourceNode: ref(node1.id),
        sourcePort: ref(1),
        destNode: ref(node2.id),
        destPort: ref(1),
        absolutePoint: ref([0, 0] as [number, number]),
      },
      mockedStores,
    });

    const { renderable } = getComposableResult();
    expect(renderable.value).toBe(true);

    // @ts-expect-error
    mockedStores.webglCanvasStore.visibleArea = {
      x: 100,
      y: 200,
      width: 500,
      height: 500,
    };
    await nextTick();
    expect(renderable.value).toBe(false);
  });
});
