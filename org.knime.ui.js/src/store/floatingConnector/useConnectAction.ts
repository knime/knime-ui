/* eslint-disable func-style */
/* eslint-disable no-undefined */
import { computed, ref } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import type { Direction } from "@/util/compatibleConnections";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import { useCanvasAnchoredComponentsStore } from "../canvasAnchoredComponents/canvasAnchoredComponents";
import { useNodeInteractionsStore } from "../workflow/nodeInteractions";

import {
  type FullFloatingConnector,
  type SnapTarget,
  type SnappedPlaceholderPort,
  isPlaceholderPort,
} from "./types";

type FinishConnectionParams = {
  floatingConnector: FullFloatingConnector | undefined;
  snapTarget: SnapTarget | undefined;
  activeSnapPosition: XY | undefined;
};

const createConnectionPayload = (params: {
  sourceNodeId: string;
  sourcePortIndex: number;
  targetNodeId: string;
  targetPortIndex: number;
  direction: Direction;
}) => {
  const {
    sourceNodeId,
    sourcePortIndex,
    targetNodeId,
    targetPortIndex,
    direction,
  } = params;

  return direction === "in"
    ? {
        sourceNode: sourceNodeId,
        sourcePort: sourcePortIndex,
        destNode: targetNodeId,
        destPort: targetPortIndex,
      }
    : {
        sourceNode: targetNodeId,
        sourcePort: targetPortIndex,
        destNode: sourceNodeId,
        destPort: sourcePortIndex,
      };
};

export const useConnectAction = () => {
  const waitingForPortSelection = ref(false);
  const nodeInteractionsStore = useNodeInteractionsStore();

  const addPortAndConnectIt = async (params: {
    sourceNodeId: string;
    sourcePortIndex: number;
    targetNodeId: string;
    targetPortTypeId: string;
    portSide: "input" | "output";
    portGroup?: string;
  }) => {
    const {
      sourceNodeId,
      sourcePortIndex,
      targetNodeId,
      targetPortTypeId,
      portSide,
      portGroup,
    } = params;

    const { newPortIdx } = await nodeInteractionsStore.addNodePort({
      nodeId: targetNodeId,
      side: portSide,
      typeId: targetPortTypeId,
      portGroup,
    });

    await nodeInteractionsStore.connectNodes(
      createConnectionPayload({
        sourceNodeId,
        sourcePortIndex,
        targetNodeId,
        targetPortIndex: newPortIdx,
        direction: portSide === "input" ? "in" : "out",
      }),
    );
  };

  /**
   * Completes the connection interaction. This function can either connect to an
   * already existing port; or, in case of a placeholder port, add a new port
   * and then connect to it
   */
  const finishConnection = async (
    params: FinishConnectionParams,
  ): Promise<void> => {
    const { floatingConnector, snapTarget } = params;

    // check for proper TS inference; shouldn't happen
    if (!snapTarget || !floatingConnector) {
      return Promise.reject(new Error("invalid state"));
    }

    const { wasAborted } = await useSelectionStore().deselectAllObjects([
      snapTarget.parentNodeId,
    ]);

    if (wasAborted) {
      return Promise.reject(new Error("aborting connection"));
    }

    const targetPortDirection =
      floatingConnector.context.origin === "out" ? "in" : "out";

    if (!isPlaceholderPort(snapTarget)) {
      await nodeInteractionsStore.connectNodes(
        createConnectionPayload({
          sourceNodeId: floatingConnector.context.parentNodeId,
          sourcePortIndex: floatingConnector.context.portInstance.index,
          targetNodeId: snapTarget.parentNodeId,
          targetPortIndex: snapTarget.index,
          direction: targetPortDirection,
        }),
      );

      return Promise.resolve();
    }

    if (isPlaceholderPort(snapTarget)) {
      // eslint-disable-next-line no-use-before-define
      return connectViaPlaceHolderPort(params, targetPortDirection);
    }

    return Promise.reject(new Error("invalid state"));
  };

  async function connectViaPlaceHolderPort(
    params: FinishConnectionParams,
    targetPortDirection: "in" | "out",
  ): Promise<void> {
    const { activeSnapPosition, floatingConnector, snapTarget } = params;

    // TS check
    if (!snapTarget || !floatingConnector || !activeSnapPosition) {
      return Promise.reject(new Error("invalid state"));
    }

    const { validPortGroups } = snapTarget as SnappedPlaceholderPort;

    if (!validPortGroups) {
      return Promise.reject(new Error("invalid state"));
    }

    const portGroupKeys = Object.keys(validPortGroups);
    const [firstPortGroup] = portGroupKeys;

    // create the port if the targetPort is marked as a placeholder port
    // we have a single direct match so just add and connect it
    if (
      portGroupKeys.length === 1 &&
      validPortGroups[firstPortGroup].supportedPortTypeIds?.length === 1
    ) {
      const [typeId] = validPortGroups[firstPortGroup].supportedPortTypeIds;

      await addPortAndConnectIt({
        sourceNodeId: floatingConnector.context.parentNodeId,
        sourcePortIndex: floatingConnector.context.portInstance.index,
        targetNodeId: snapTarget.parentNodeId,
        targetPortTypeId: typeId,
        portSide: targetPortDirection === "in" ? "input" : "output",
        portGroup: firstPortGroup === "default" ? undefined : firstPortGroup,
      });

      return Promise.resolve();
    }

    const { promise, resolve, reject } = createUnwrappedPromise<void>();

    const canvasAnchoredComponentsStore = useCanvasAnchoredComponentsStore();
    waitingForPortSelection.value = true;
    canvasAnchoredComponentsStore.openPortTypeMenu({
      nodeId: snapTarget.parentNodeId,
      props: {
        side: `${snapTarget.side}put`,
        position: activeSnapPosition,
        portGroups: validPortGroups,
      },
      events: {
        itemActive: (item) => {
          canvasAnchoredComponentsStore.setPortTypeMenuPreviewPort(
            item?.port ?? null,
          );
        },
        itemClick: async ({ typeId, portGroup }) => {
          const targetPortGroup = portGroup === "default" ? null : portGroup;

          try {
            await addPortAndConnectIt({
              sourceNodeId: floatingConnector.context.parentNodeId,
              sourcePortIndex: floatingConnector.context.portInstance.index,
              targetNodeId: snapTarget.parentNodeId,
              targetPortTypeId: typeId,
              portSide: targetPortDirection === "in" ? "input" : "output",
              portGroup: targetPortGroup ?? undefined,
            });
            consola.debug(
              "floatingConnector::useConnectAction - added port and connected via placeholder port",
            );
            resolve();
          } catch (error) {
            reject(error);
          } finally {
            waitingForPortSelection.value = false;
          }
        },
        menuClose: () => {
          consola.debug(
            "floatingConnector::useConnectAction - closing port-type menu for placeholder port",
          );
          canvasAnchoredComponentsStore.closePortTypeMenu();
          waitingForPortSelection.value = false;
          resolve();
        },
      },
    });

    return promise;
  }

  return {
    finishConnection,
    waitingForPortSelection: computed(() => waitingForPortSelection.value),
  };
};
