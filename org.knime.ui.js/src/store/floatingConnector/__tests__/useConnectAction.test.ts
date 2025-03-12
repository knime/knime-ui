import { describe, expect, it } from "vitest";
import { type Ref, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { sleep } from "@knime/utils";

import type { NodePortGroups } from "@/api/custom-types";
import { createNativeNode, createPort } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import type { FloatingConnector, SnapTarget } from "../types";
import { useConnectAction } from "../useConnectAction";

import { createMockFloatingConnector } from "./utils";

const mockedAPI = deepMocked(API);

describe("floatingConnector::useConnectAction", () => {
  const createMockSnapTarget = (
    parentNodeId: string,
    portIndex: number,
    isPlaceholder = false,
    validPortGroups: NodePortGroups | null = null,
  ) => {
    if (isPlaceholder) {
      return ref<SnapTarget>({
        isPlaceHolderPort: true,
        typeId: "table",
        side: "in",
        validPortGroups: validPortGroups ?? {
          customOptionalGroup: {
            supportedPortTypeIds: ["table"],
          },
        },
        parentNodeId,
      });
    }

    return ref<SnapTarget>({
      ...createPort({ index: portIndex }),
      side: "in",
      parentNodeId,
    });
  };

  const doMount = ({
    floatingConnector,
    snapTarget,
  }: {
    floatingConnector: Ref<FloatingConnector>;
    snapTarget: Ref<SnapTarget>;
  }) => {
    const mockedStores = mockStores();

    const result = mountComposable({
      composable: useConnectAction,
      composableProps: {
        floatingConnector,
        snapTarget,
        activeSnapPosition: ref({ x: 0, y: 10 }),
      },
      mockedStores,
    });

    return { mockedStores, ...result };
  };

  it("should connect to a snapped port", async () => {
    const fromNode = createNativeNode({
      id: "root:1",
      outPorts: [createPort({ index: 0 })],
    });
    const floatingConnector = createMockFloatingConnector(fromNode, 0);
    const snapTarget = createMockSnapTarget("root:2", 2);

    const { getComposableResult, mockedStores } = doMount({
      floatingConnector,
      snapTarget,
    });

    const { finishConnection } = getComposableResult();

    finishConnection();
    await flushPromises();

    expect(
      mockedStores.nodeInteractionsStore.connectNodes,
    ).toHaveBeenCalledWith({
      sourceNode: "root:1",
      sourcePort: 0,
      destNode: "root:2",
      destPort: 2,
    });
  });

  it("should add port and then connect when snapping to a placeholder port", async () => {
    const fromNode = createNativeNode({
      id: "root:1",
      outPorts: [createPort({ index: 0 })],
    });
    const floatingConnector = createMockFloatingConnector(fromNode, 0);
    const snapTarget = createMockSnapTarget("root:2", 2, true);

    mockedAPI.workflowCommand.AddPort.mockResolvedValue({ newPortIdx: 3 });

    const { getComposableResult, mockedStores } = doMount({
      floatingConnector,
      snapTarget,
    });

    const { finishConnection } = getComposableResult();

    finishConnection();
    await flushPromises();

    expect(mockedStores.nodeInteractionsStore.addNodePort).toHaveBeenCalledWith(
      {
        nodeId: "root:2",
        side: "input",
        typeId: "table",
        portGroup: "customOptionalGroup",
      },
    );

    expect(
      mockedStores.nodeInteractionsStore.connectNodes,
    ).toHaveBeenCalledWith({
      sourceNode: "root:1",
      sourcePort: 0,
      destNode: "root:2",
      destPort: 3,
    });
  });

  describe("connect to placeholder with multiple possible portgroups", () => {
    it("should open porttype menu and connect after user selects port group", async () => {
      const fromNode = createNativeNode({
        id: "root:1",
        outPorts: [createPort({ index: 0 })],
      });
      const floatingConnector = createMockFloatingConnector(fromNode, 0);
      const snapTarget = createMockSnapTarget("root:2", 2, true, {
        customOptionalGroup: {
          supportedPortTypeIds: ["table"],
        },
        anotherGroup: {
          supportedPortTypeIds: ["table"],
        },
      });

      mockedAPI.workflowCommand.AddPort.mockResolvedValue({ newPortIdx: 3 });

      const { getComposableResult, mockedStores } = doMount({
        floatingConnector,
        snapTarget,
      });

      const { finishConnection, waitingForPortSelection } =
        getComposableResult();

      expect(waitingForPortSelection.value).toBe(false);

      finishConnection();
      // one nextTick is not enough
      await sleep(0);

      expect(waitingForPortSelection.value).toBe(true);
      expect(
        mockedStores.canvasAnchoredComponentsStore.openPortTypeMenu,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.any(Object),
          nodeId: "root:2",
          props: {
            portGroups: {
              anotherGroup: {
                supportedPortTypeIds: ["table"],
              },
              customOptionalGroup: {
                supportedPortTypeIds: ["table"],
              },
            },
            position: {
              x: 0,
              y: 10,
            },
            side: "input",
          },
        }),
      );
      await flushPromises();
      expect(
        mockedStores.nodeInteractionsStore.addNodePort,
      ).not.toHaveBeenCalled();

      mockedStores.canvasAnchoredComponentsStore.portTypeMenu.events.itemClick!(
        {
          typeId: "table",
          portGroup: "anotherGroup",
        },
      );

      await flushPromises();

      expect(waitingForPortSelection.value).toBe(false);

      expect(
        mockedStores.nodeInteractionsStore.addNodePort,
      ).toHaveBeenCalledWith({
        nodeId: "root:2",
        side: "input",
        typeId: "table",
        portGroup: "anotherGroup",
      });

      expect(
        mockedStores.nodeInteractionsStore.connectNodes,
      ).toHaveBeenCalledWith({
        sourceNode: "root:1",
        sourcePort: 0,
        destNode: "root:2",
        destPort: 3,
      });
    });

    it("should not add port if porttype menu is closed", async () => {
      const fromNode = createNativeNode({
        id: "root:1",
        outPorts: [createPort({ index: 0 })],
      });
      const floatingConnector = createMockFloatingConnector(fromNode, 0);
      const snapTarget = createMockSnapTarget("root:2", 2, true, {
        customOptionalGroup: {
          supportedPortTypeIds: ["table"],
        },
        anotherGroup: {
          supportedPortTypeIds: ["table"],
        },
      });

      mockedAPI.workflowCommand.AddPort.mockResolvedValue({ newPortIdx: 3 });

      const { getComposableResult, mockedStores } = doMount({
        floatingConnector,
        snapTarget,
      });

      const { finishConnection, waitingForPortSelection } =
        getComposableResult();

      expect(waitingForPortSelection.value).toBe(false);

      finishConnection();
      // one nextTick is not enough
      await sleep(0);

      expect(waitingForPortSelection.value).toBe(true);

      mockedStores.canvasAnchoredComponentsStore.portTypeMenu.events
        .menuClose!();

      await flushPromises();

      expect(waitingForPortSelection.value).toBe(false);

      expect(
        mockedStores.nodeInteractionsStore.addNodePort,
      ).not.toHaveBeenCalled();

      expect(
        mockedStores.nodeInteractionsStore.connectNodes,
      ).not.toHaveBeenCalled();
    });

    it("should reject finishAction if a problem occurs", async () => {
      const fromNode = createNativeNode({
        id: "root:1",
        outPorts: [createPort({ index: 0 })],
      });
      const floatingConnector = createMockFloatingConnector(fromNode, 0);
      const snapTarget = createMockSnapTarget("root:2", 2, true);

      const apiError = new Error("some problem");
      mockedAPI.workflowCommand.AddPort.mockRejectedValue(apiError);

      const { getComposableResult } = doMount({
        floatingConnector,
        snapTarget,
      });

      const { finishConnection } = getComposableResult();
      await expect(() => finishConnection()).rejects.toThrow(apiError);
    });
  });
});
