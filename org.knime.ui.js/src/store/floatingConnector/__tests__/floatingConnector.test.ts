import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import type { XY } from "@/api/gateway-api/generated-api";
import { PORT_TYPE_IDS, createPort, createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import type { SnapTarget } from "../types";

const activeSnapPosition = ref<XY>();
const snapTarget = ref<SnapTarget>();
const didDragToCompatibleTarget = ref(false);

const mockedAPI = deepMocked(API);

vi.mock("../usePortSnapping", () => {
  return {
    usePortSnapping: () => ({
      activeSnapPosition,
      didDragToCompatibleTarget,
      snapTarget,
      resetSnappingState: () => {},
    }),
  };
});

describe("floatingConnector store", () => {
  const setupStore = () => {
    const mockedStores = mockStores();

    const workflow = createWorkflow();

    mockedStores.workflowStore.setActiveWorkflow(workflow);
    const canvas = document.createElement("canvas");
    mockedStores.webglCanvasStore.pixiApplication = {
      // @ts-ignore
      app: { canvas },
      canvas,
    };

    return { mockedStores, canvas };
  };

  const startDrag = (
    mockedStores: ReturnType<typeof mockStores>,
    onCanvasDrop = vi.fn(() => ({ removeConnector: true })),
  ) => {
    const draggedPort = createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable });

    const pointerDown = {
      button: 0,
      pointerId: 1,
      stopPropagation: vi.fn(),
      originalEvent: {
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      },
      global: { x: 15, y: 15 },
    };

    mockedStores.floatingConnectorStore.createConnectorFromPointerEvent(
      // @ts-ignore
      pointerDown,
      {
        direction: "out",
        isFlowVariable: false,
        nodeId: "root:1",
        port: draggedPort,
        portPosition: { x: 10, y: 10 },
        onCanvasDrop,
      },
    );

    return { draggedPort, pointerDown, onCanvasDrop };
  };

  afterEach(() => {
    activeSnapPosition.value = undefined;
    didDragToCompatibleTarget.value = false;
    snapTarget.value = undefined;
  });

  const pointerMove = (
    canvas: HTMLCanvasElement,
    offsets = { offsetX: 100, offsetY: 100 },
  ) => {
    canvas.dispatchEvent(
      new PointerEvent("pointermove", {
        // @ts-ignore
        offsetX: offsets.offsetX,
        offsetY: offsets.offsetY,
      }),
    );
  };

  it("creates the drag connector when a port is dragged", () => {
    const { mockedStores, canvas } = setupStore();

    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
    const { onCanvasDrop, pointerDown, draggedPort } = startDrag(mockedStores);
    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
    expect(pointerDown.stopPropagation).toHaveBeenCalled();
    expect(pointerDown.originalEvent.preventDefault).toHaveBeenCalled();
    expect(pointerDown.originalEvent.stopPropagation).toHaveBeenCalled();

    pointerMove(canvas);

    expect(mockedStores.floatingConnectorStore.floatingConnector).toEqual({
      absolutePoint: {
        x: 100,
        y: 100,
      },
      allowedActions: {
        canDelete: false,
      },
      context: {
        origin: "out",
        parentNodeId: "root:1",
        portInstance: draggedPort,
        portPosition: {
          x: 10,
          y: 10,
        },
      },
      flowVariableConnection: false,
      id: "global-floating-connector",
      sourceNode: "root:1",
      sourcePort: 0,
    });

    canvas.dispatchEvent(new PointerEvent("pointerup"));
    expect(onCanvasDrop).toHaveBeenCalled();
    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
  });

  it("respects the snap position when updating the drag connector coords", () => {
    const { mockedStores, canvas } = setupStore();

    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
    startDrag(mockedStores);
    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();

    pointerMove(canvas);

    expect(mockedStores.floatingConnectorStore.floatingConnector).toEqual(
      expect.objectContaining({
        absolutePoint: {
          x: 100,
          y: 100,
        },
      }),
    );

    // mock snapping
    activeSnapPosition.value = { x: 150, y: 150 };

    pointerMove(canvas, { offsetX: 120, offsetY: 120 });

    expect(mockedStores.floatingConnectorStore.floatingConnector).toEqual(
      expect.objectContaining({
        absolutePoint: {
          x: 150,
          y: 150,
        },
      }),
    );

    pointerMove(canvas, { offsetX: 160, offsetY: 160 });

    expect(mockedStores.floatingConnectorStore.floatingConnector).toEqual(
      expect.objectContaining({
        absolutePoint: {
          x: 150,
          y: 150,
        },
      }),
    );

    // mock snapping
    activeSnapPosition.value = undefined;

    pointerMove(canvas, { offsetX: 160, offsetY: 160 });

    expect(mockedStores.floatingConnectorStore.floatingConnector).toEqual(
      expect.objectContaining({
        absolutePoint: {
          x: 160,
          y: 160,
        },
      }),
    );
  });

  it("should not remove the connector if the onCanvasDrop callback returns false", () => {
    const { mockedStores, canvas } = setupStore();

    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
    const { onCanvasDrop } = startDrag(
      mockedStores,
      vi.fn(() => ({ removeConnector: false })),
    );
    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();

    pointerMove(canvas);

    canvas.dispatchEvent(new PointerEvent("pointerup"));
    expect(onCanvasDrop).toHaveBeenCalled();
    expect(mockedStores.floatingConnectorStore.floatingConnector).toBeDefined();
  });

  it("connects the nodes when the connector is dropped on a port", async () => {
    const { mockedStores, canvas } = setupStore();

    const { onCanvasDrop } = startDrag(mockedStores);

    pointerMove(canvas);

    didDragToCompatibleTarget.value = true;
    snapTarget.value = {
      parentNodeId: "root:2",
      ...createPort({
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        index: 3,
      }),
    };

    canvas.dispatchEvent(new PointerEvent("pointerup"));

    await flushPromises();

    expect(
      mockedStores.nodeInteractionsStore.connectNodes,
    ).toHaveBeenCalledWith({
      destNode: "root:2",
      destPort: 3,
      sourceNode: "root:1",
      sourcePort: 0,
    });
    expect(onCanvasDrop).not.toHaveBeenCalled();
    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
  });

  it("connects the nodes when the connector is dropped on a port placehoder", async () => {
    const { mockedStores, canvas } = setupStore();

    mockedAPI.workflowCommand.AddPort.mockResolvedValue({ newPortIdx: 5 });
    const { onCanvasDrop } = startDrag(mockedStores);

    pointerMove(canvas);

    didDragToCompatibleTarget.value = true;
    snapTarget.value = {
      parentNodeId: "root:2",
      isPlaceHolderPort: true,
      typeId: PORT_TYPE_IDS.BufferedDataTable,
      validPortGroups: {
        someCustomGroup: {
          canAddOutPort: true,
          supportedPortTypeIds: [PORT_TYPE_IDS.PortObject],
        },
      },
    };

    canvas.dispatchEvent(new PointerEvent("pointerup"));

    await flushPromises();

    expect(mockedStores.nodeInteractionsStore.addNodePort).toHaveBeenCalledWith(
      {
        nodeId: "root:2",
        side: "input",
        typeId: PORT_TYPE_IDS.PortObject,
        portGroup: "someCustomGroup",
      },
    );

    expect(
      mockedStores.nodeInteractionsStore.connectNodes,
    ).toHaveBeenCalledWith({
      destNode: "root:2",
      destPort: 5,
      sourceNode: "root:1",
      sourcePort: 0,
    });
    expect(onCanvasDrop).not.toHaveBeenCalled();
    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
  });

  it("creates a floatingConnector manually based on a provided context", () => {
    const { mockedStores } = setupStore();

    expect(
      mockedStores.floatingConnectorStore.floatingConnector,
    ).toBeUndefined();
    const referencePort = createPort();
    mockedStores.floatingConnectorStore.createConnectorFromContext(
      "root:1",
      referencePort,
      { x: 100, y: 100 },
      "PREDECESSORS",
    );

    expect(mockedStores.floatingConnectorStore.floatingConnector).toEqual({
      absolutePoint: { x: 100, y: 100 },
      allowedActions: {
        canDelete: false,
      },
      context: {
        origin: "in",
        parentNodeId: "root:1",
        portInstance: referencePort,
        portPosition: { x: 100, y: 100 },
      },
      destNode: "root:1",
      destPort: 0,
      flowVariableConnection: false,
      id: "quick-add-root:1-0",
      interactive: false,
    });
  });
});
