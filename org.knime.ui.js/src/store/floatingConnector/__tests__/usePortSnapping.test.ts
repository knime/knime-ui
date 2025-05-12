import { describe, expect, it, vi } from "vitest";
import { type Ref, nextTick, ref } from "vue";

import { PortType, type XY } from "@/api/gateway-api/generated-api";
import type { PortPositions } from "@/components/workflowEditor/common/usePortPositions";
import { $bus } from "@/plugins/event-bus";
import {
  PORT_TYPE_IDS,
  createAvailablePortTypes,
  createNativeNode,
  createPort,
  createPortType,
  createWorkflow,
} from "@/test/factories";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import type {
  FloatingConnector,
  SnappedPlaceholderPort,
  SnappedPort,
} from "../types";
import { usePortSnapping } from "../usePortSnapping";

import { createMockFloatingConnector } from "./utils";

describe("floatingConnector:usePortSnapping", () => {
  const availablePortTypes = createAvailablePortTypes({
    [PORT_TYPE_IDS.BufferedDataTable]: createPortType({
      kind: PortType.KindEnum.Table,
      compatibleTypes: [PORT_TYPE_IDS.BufferedDataTable],
    }),
    [PORT_TYPE_IDS.FlowVariablePortObject]: createPortType({
      kind: PortType.KindEnum.FlowVariable,
      compatibleTypes: [PORT_TYPE_IDS.FlowVariablePortObject],
    }),
    [PORT_TYPE_IDS.DatabasePortObject]: createPortType({
      kind: PortType.KindEnum.Generic,
      compatibleTypes: [PORT_TYPE_IDS.BufferedDataTable],
    }),
    [PORT_TYPE_IDS.FileSystemPortObject]: createPortType({
      kind: PortType.KindEnum.Other,
      compatibleTypes: [PORT_TYPE_IDS.FileSystemPortObject],
    }),
  });

  // the node dragging out of
  const sourceNode = createNativeNode({
    id: "root:1",
    position: { x: 10, y: 10 },
    outPorts: [
      createPort({ typeId: PORT_TYPE_IDS.FlowVariablePortObject, index: 0 }),
      createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable, index: 1 }),
    ],
  });

  const referenceNode = {
    // the node dragging into
    instance: createNativeNode({
      id: "root:2",
      position: { x: 30, y: 10 },
      inPorts: [
        createPort({
          typeId: PORT_TYPE_IDS.FlowVariablePortObject,
          index: 0,
        }),
        createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable, index: 1 }),
        createPort({ typeId: PORT_TYPE_IDS.BufferedDataTable, index: 2 }),
      ],
      outPorts: [],
    }),
    portPositions: {
      in: [
        [0, -4.5],
        [-4.5, 5.5],
        [-4.5, 26.5],
      ],
      out: [],
    } satisfies PortPositions,
  };

  type MountOpts = {
    floatingConnector: Ref<FloatingConnector>;
    pointerMoveAbsoluteCoords: Ref<XY>;
  };

  const doMount = ({
    floatingConnector,
    pointerMoveAbsoluteCoords,
  }: MountOpts) => {
    const mockedStores = mockStores();

    const workflow = createWorkflow({
      nodes: {
        [sourceNode.id]: sourceNode,
        [referenceNode.instance.id]: referenceNode.instance,
      },
    });

    mockedStores.workflowStore.setActiveWorkflow(workflow);
    mockedStores.applicationStore.setAvailablePortTypes(availablePortTypes);

    const result = mountComposable({
      composable: usePortSnapping,
      composableProps: {
        floatingConnector,
        pointerMoveAbsoluteCoords,
      },
    });

    return { ...result, mockedStores };
  };

  const mockCursorPosition = ref({ x: 0, y: 0 });

  const moveMouseOverReferenceNode = (
    toPosition: XY,
    onMoveOverConnectionSnapCandidate: ReturnType<
      typeof usePortSnapping
    >["onMoveOverConnectionSnapCandidate"],
  ) => {
    mockCursorPosition.value = toPosition;

    onMoveOverConnectionSnapCandidate({
      candidate: referenceNode.instance,
      portPositions: referenceNode.portPositions,
    });
  };

  it("should snap correctly", () => {
    const floatingConnector = createMockFloatingConnector(sourceNode, 1);

    const { getComposableResult } = doMount({
      floatingConnector,
      pointerMoveAbsoluteCoords: mockCursorPosition,
    });

    const {
      activeSnapPosition,
      didDragToCompatibleTarget,
      isInsideSnapRegion,
      snapTarget,
      onMoveOverConnectionSnapCandidate,
      onLeaveConnectionSnapCandidate,
    } = getComposableResult();

    expect(activeSnapPosition.value).toBeUndefined();
    expect(didDragToCompatibleTarget.value).toBe(false);
    expect(isInsideSnapRegion.value).toBe(false);
    expect(snapTarget.value).toBeUndefined();

    // move to a position where a snap can't happen yet (the flow variable port)
    moveMouseOverReferenceNode(
      { x: 30, y: 10 },
      onMoveOverConnectionSnapCandidate,
    );
    expect(isInsideSnapRegion.value).toBe(true);
    expect(snapTarget.value).toBeUndefined();
    expect(didDragToCompatibleTarget.value).toBe(false);
    expect(activeSnapPosition.value).toBeUndefined();

    // move to a position further down the Y axis where a snap can happen
    moveMouseOverReferenceNode(
      { x: 30, y: 15 },
      onMoveOverConnectionSnapCandidate,
    );

    expect(activeSnapPosition.value).toEqual({ x: 25.5, y: 15.5 });
    expect(didDragToCompatibleTarget.value).toBe(true);
    expect(snapTarget.value).toEqual(
      expect.objectContaining({
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        index: 1,
      }),
    );

    // move to a position further down the Y axis where a snap can happen
    moveMouseOverReferenceNode(
      { x: 30, y: 30 },
      onMoveOverConnectionSnapCandidate,
    );

    expect(activeSnapPosition.value).toEqual({ x: 25.5, y: 36.5 });
    expect(didDragToCompatibleTarget.value).toBe(true);
    expect(snapTarget.value).toEqual(
      expect.objectContaining({
        typeId: PORT_TYPE_IDS.BufferedDataTable,
        index: 2,
      }),
    );

    onLeaveConnectionSnapCandidate({
      referenceNode: referenceNode.instance,
      parentNodePortPositions: referenceNode.portPositions,
    });

    expect(isInsideSnapRegion.value).toBe(false);
  });

  it("communicates snap state via bus", async () => {
    const floatingConnector = createMockFloatingConnector(sourceNode, 1);

    const busEmitSpy = vi.spyOn($bus, "emit");

    const { getComposableResult } = doMount({
      floatingConnector,
      pointerMoveAbsoluteCoords: mockCursorPosition,
    });

    const { snapTarget } = getComposableResult();

    const snapPortValue = {
      ...createPort({ index: 3 }),
      parentNodeId: "root:1",
      side: "in",
    } satisfies SnappedPort;

    snapTarget.value = snapPortValue;
    await nextTick();

    expect(busEmitSpy).toHaveBeenCalledWith(
      "connector-snap-active_root:1__in__3",
      { snapTarget: snapPortValue },
    );

    snapTarget.value = undefined;
    await nextTick();

    expect(busEmitSpy).toHaveBeenCalledWith(
      "connector-snap-inactive_root:1__in__3",
      { snapTarget: snapPortValue },
    );

    const snapPlaceholderPortValue = {
      isPlaceHolderPort: true,
      typeId: PORT_TYPE_IDS.BufferedDataTable,
      validPortGroups: null,
      parentNodeId: "root:1",
      side: "in",
    } satisfies SnappedPlaceholderPort;

    snapTarget.value = snapPlaceholderPortValue;
    await nextTick();

    expect(busEmitSpy).toHaveBeenCalledWith(
      "connector-snap-active-placeholder_root:1__in",
      { snapTarget: snapPlaceholderPortValue },
    );

    snapTarget.value = undefined;
    await nextTick();

    expect(busEmitSpy).toHaveBeenCalledWith(
      "connector-snap-inactive-placeholder_root:1__in",
      { snapTarget: snapPlaceholderPortValue },
    );
  });
});
