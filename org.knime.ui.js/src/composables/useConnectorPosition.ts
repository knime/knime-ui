import { computed, type Ref } from "vue";

import portShift from "@/util/portShift";
import * as $shapes from "@/style/shapes.mjs";

import { useStore } from "./useStore";
import { usePortBarPositions } from "./usePortBarPositions";
import type { KnimeNode, XYTuple } from "@/api/custom-types";
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
  absolutePoint: Ref<[number, number]>;
};

type SourceOrDest = "source" | "dest";

export const useConnectorPosition = (options: UseConnectorPositionOptions) => {
  const store = useStore();
  const workflow = computed(() => store.state.workflow.activeWorkflow);

  const { portBarXPos, portBarItemYPos } = usePortBarPositions();

  const referenceNodes = useConnectedNodeObjects({
    sourceNode: options.sourceNode,
    destNode: options.destNode,
  });

  const getRegularNodePortPosition = (
    sourceNodeIndex: number,
    type: SourceOrDest,
    node: KnimeNode,
  ): XYTuple => {
    const allPorts = type === "source" ? node.outPorts : node.inPorts;
    const [dx, dy] = portShift(
      sourceNodeIndex,
      allPorts.length,
      node.kind === "metanode",
      type === "source",
    );
    const { x, y } = node.position;

    return [x + dx, y + dy];
  };

  const getMetaNodePortPosition = (
    sourceNodeIndex: number,
    type: SourceOrDest,
  ): XYTuple => {
    const allPorts =
      type === "source"
        ? workflow.value.metaInPorts
        : workflow.value.metaOutPorts;

    let x = portBarXPos(allPorts, type === "dest");
    const delta = $shapes.portSize / 2;
    x += type === "source" ? delta : -delta;

    const y = portBarItemYPos(sourceNodeIndex, allPorts.ports, true);

    return [x, y];
  };

  const getEndPointCoordinates = (type: SourceOrDest = "dest"): XYTuple => {
    const sourceNodeIndex = options[`${type}Port`];
    const node = referenceNodes[`${type}NodeObject`];
    if (node.value) {
      // connected to a node
      return getRegularNodePortPosition(
        sourceNodeIndex.value,
        type,
        node.value,
      );
    } else {
      // connected to a metanode port bar
      return getMetaNodePortPosition(sourceNodeIndex.value, type);
    }
  };

  // @ts-ignore
  const start = computed<XYTuple>(
    () =>
      (options.sourceNode.value && getEndPointCoordinates("source")) ||
      options.absolutePoint.value ||
      [],
  );

  // @ts-ignore
  const end = computed<XYTuple>(
    () =>
      (options.destNode.value && getEndPointCoordinates("dest")) ||
      options.absolutePoint.value ||
      [],
  );

  return {
    start,
    end,
    ...referenceNodes,
  };
};
