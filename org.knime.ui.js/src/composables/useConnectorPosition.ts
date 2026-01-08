import { type Ref, computed } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import { ports } from "@/util/workflow-canvas";

import { useConnectedNodeObjects } from "./useConnectedNodeObjects";
import { usePortBarPositions } from "./usePortBarPositions";

type UseConnectorPositionOptions = {
  /**
   * Node ID of the connector's source node
   */
  sourceNode: Ref<string | null>;
  /**
   * Node ID of the connector's target node
   */
  destNode: Ref<string | null>;
  /**
   * Index of the source node's output port that this connector is attached to
   */
  sourcePort: Ref<number | null>;
  /**
   * Index of the target node's input port that this connector is attached to
   */
  destPort: Ref<number | null>;
  /**
   * If either destNode or sourceNode is unspecified the connector will be drawn up to this point
   */
  absolutePoint: Ref<[number, number] | null>;
};

type SourceOrDest = "source" | "dest";

export const useConnectorPosition = (options: UseConnectorPositionOptions) => {
  const { portBarXPos, getPortBarPortYPosition } = usePortBarPositions();

  const referenceNodes = useConnectedNodeObjects({
    sourceNode: options.sourceNode,
    destNode: options.destNode,
  });

  const getMetaNodePortPosition = (
    portIndex: number,
    type: SourceOrDest,
  ): XY => {
    let x = portBarXPos(type === "dest");
    const delta = $shapes.portSize / 2;
    x += type === "source" ? delta : -delta;

    const y = getPortBarPortYPosition(portIndex, type === "dest", true);

    return { x, y };
  };

  const getEndPointCoordinates = (type: SourceOrDest = "dest"): XY => {
    const reference =
      type === "source"
        ? referenceNodes.sourceNodeObject
        : referenceNodes.destNodeObject;
    const referenceId =
      type === "source" ? options.sourceNode : options.destNode;

    const referencePortIndex =
      type === "source" ? options.sourcePort : options.destPort;

    if (!referenceId.value || referencePortIndex.value === null) {
      consola.warn(
        "Invalid state. No reference identifiers found to determine connector position",
      );
      return { x: 0, y: 0 };
    }

    if (!reference.value) {
      // connected to a metanode port bar
      return getMetaNodePortPosition(referencePortIndex.value, type);
    }

    return ports.getPortPositionInNode(
      referencePortIndex.value,
      type,
      reference.value,
    );
  };

  const start = computed<XY>(() => {
    if (options.sourceNode.value) {
      return getEndPointCoordinates("source");
    }

    if (options.absolutePoint.value) {
      return {
        x: options.absolutePoint.value.at(0)!,
        y: options.absolutePoint.value.at(1)!,
      };
    }

    return { x: 0, y: 0 };
  });

  const end = computed<XY>(() => {
    if (options.destNode.value) {
      return getEndPointCoordinates("dest");
    }

    if (options.absolutePoint.value) {
      return {
        x: options.absolutePoint.value.at(0)!,
        y: options.absolutePoint.value.at(1)!,
      };
    }

    return { x: 0, y: 0 };
  });

  return {
    start,
    end,
    ...referenceNodes,
  };
};
