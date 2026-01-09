import { type ComputedRef, computed, watch } from "vue";

import type { KnimeNode } from "@/api/custom-types";
import { ports } from "@/lib/workflow-canvas";

import { useNodeInfo } from "./useNodeInfo";

export type PortPositions = {
  in: Array<[number, number]>;
  out: Array<[number, number]>;
};

type UsePortPositionsOptions = {
  nodeId: string;
  inPorts: KnimeNode["inPorts"];
  outPorts: KnimeNode["outPorts"];
  canAddPort: ComputedRef<{ input: boolean; output: boolean }>;
  emitPositionUpdate: (positions: PortPositions) => void;
};

export const usePortPositions = (options: UsePortPositionsOptions) => {
  const { isMetanode } = useNodeInfo({ nodeId: options.nodeId });

  /**
   * @returns the position of all inPorts and outPorts.
   * The position for each port is an array with two coordinates [x, y].
   */
  const portPositions = computed<PortPositions>(() => {
    const positions = {
      in: ports.positions({
        portCount: options.inPorts.length,
        isMetanode: isMetanode.value,
      }),
      out: ports.positions({
        portCount: options.outPorts.length,
        isMetanode: isMetanode.value,
        isOutports: true,
      }),
    };

    // add placeholder positions to enable the drop to a placeholder
    if (options.canAddPort.value.input) {
      positions.in.push(
        ports.placeholderPosition({
          portCount: options.inPorts.length,
          isMetanode: isMetanode.value,
        }),
      );
    }

    if (options.canAddPort.value.output) {
      positions.out.push(
        ports.placeholderPosition({
          portCount: options.outPorts.length,
          isMetanode: isMetanode.value,
          isOutport: true,
        }),
      );
    }

    return positions;
  });

  const addPortPlaceholderPositions = computed(() => {
    // the last position is the one of the placeholder
    return {
      input: portPositions.value.in[portPositions.value.in.length - 1],
      output: portPositions.value.out[portPositions.value.out.length - 1],
    };
  });

  watch(
    portPositions,
    () => {
      options.emitPositionUpdate(portPositions.value);
    },
    { immediate: true },
  );

  return { addPortPlaceholderPositions, portPositions };
};
