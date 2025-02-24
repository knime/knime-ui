import { describe, expect, it, vi } from "vitest";
import { computed } from "vue";

import { createNativeNode, createPort, createWorkflow } from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { usePortPositions } from "../usePortPositions";

describe("usePortPositions", () => {
  const doMount = () => {
    const mockedStores = mockStores();

    const node = createNativeNode({
      inPorts: [
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
      ],
      outPorts: [
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
        createPort({ typeId: "org.knime.core.node.BufferedDataTable" }),
      ],
    });

    const workflow = createWorkflow({
      nodes: {
        [node.id]: node,
      },
    });

    mockedStores.workflowStore.setActiveWorkflow(workflow);

    const onPositionUpdate = vi.fn();

    const result = mountComposable({
      composable: usePortPositions,
      mockedStores,
      composableProps: {
        nodeId: node.id,
        inPorts: node.inPorts,
        outPorts: node.outPorts,
        canAddPort: computed(() => ({ input: true, output: true })),
        emitPositionUpdate: onPositionUpdate,
      },
    });

    return { ...result, onPositionUpdate, mockedStores };
  };

  it("should calculate the positions correctly", () => {
    const { getComposableResult } = doMount();

    const { portPositions, addPortPlaceholderPositions } =
      getComposableResult();

    expect(portPositions.value).toEqual({
      in: [
        [0, -4.5],
        [-4.5, 5.5],
        [-4.5, 26.5],
        [-4.5, 37],
      ],
      out: [
        [32, -4.5],
        [36.5, 5.5],
        [36.5, 26.5],
        [36.5, 37],
      ],
    });
    expect(addPortPlaceholderPositions.value).toEqual({
      input: [-4.5, 37],
      output: [36.5, 37],
    });
  });

  it("should call the position update callback", () => {
    const { getComposableResult, onPositionUpdate } = doMount();

    expect(onPositionUpdate).toHaveBeenCalledOnce();
    expect(onPositionUpdate).toHaveBeenCalledWith(
      getComposableResult().portPositions.value,
    );
  });
});
