import { computed, type Ref } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";
import portShift from "@/util/portShift";
import * as $shapes from "@/style/shapes";

import { usePortBarPositions } from "./usePortBarPositions";
import { useConnectedNodeObjects } from "./useConnectedNodeObjects";

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

  const getRegularNodePortPosition = (
    sourceNodeIndex: number,
    type: SourceOrDest,
    node: KnimeNode,
  ): XY => {
    const allPorts = type === "source" ? node.outPorts : node.inPorts;
    const [dx, dy] = portShift(
      sourceNodeIndex,
      allPorts.length,
      node.kind === "metanode",
      type === "source",
    );
    const { x, y } = node.position;

    return {
      x: x + dx,
      y: y + dy,
    };
  };

  const getMetaNodePortPosition = (
    sourceNodeIndex: number,
    type: SourceOrDest,
  ): XY => {
    let x = portBarXPos(type === "dest");
    const delta = $shapes.portSize / 2;
    x += type === "source" ? delta : -delta;

    const y = getPortBarPortYPosition(sourceNodeIndex, type === "dest", true);

    return { x, y };
  };

  const getEndPointCoordinates = (type: SourceOrDest = "dest"): XY => {
    const portIndex = options[`${type}Port`];
    const node = referenceNodes[`${type}NodeObject`];
    if (node.value) {
      // connected to a node
      return getRegularNodePortPosition(portIndex.value!, type, node.value);
    } else {
      // connected to a metanode port bar
      return getMetaNodePortPosition(portIndex.value!, type);
    }
  };

  const start = computed<XY>(
    () =>
      (options.sourceNode.value && getEndPointCoordinates("source")) ||
      (options.absolutePoint.value && {
        x: options.absolutePoint.value.at(0)!,
        y: options.absolutePoint.value.at(1)!,
      }) || { x: 0, y: 0 },
  );

  const end = computed<XY>(
    () =>
      (options.destNode.value && getEndPointCoordinates("dest")) ||
      (options.absolutePoint.value && {
        x: options.absolutePoint.value.at(0)!,
        y: options.absolutePoint.value.at(1)!,
      }) || { x: 0, y: 0 },
  );

  return {
    start,
    end,
    ...referenceNodes,
  };
};
