/* eslint-disable func-style */
/* eslint-disable no-undefined */
import { type Ref, computed, ref } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import type { Direction } from "@/util/compatibleConnections";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import { useCanvasAnchoredComponentsStore } from "../canvasAnchoredComponents/canvasAnchoredComponents";
import { useNodeConfigurationStore } from "../nodeConfiguration/nodeConfiguration";
import { useNodeInteractionsStore } from "../workflow/nodeInteractions";

import {
  type FullFloatingConnector,
  type SnapTarget,
  type SnappedPlaceholderPort,
  isPlaceholderPort,
} from "./types";

type UseConnectActionOptions = {
  floatingConnector: Ref<FullFloatingConnector | undefined>;
  snapTarget: Ref<SnapTarget | undefined>;
  activeSnapPosition: Ref<XY | undefined>;
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

export const useConnectAction = (options: UseConnectActionOptions) => {
  const { floatingConnector, snapTarget, activeSnapPosition } = options;

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
  const finishConnection = async (): Promise<void> => {
    // check for proper TS inference; shouldn't happen
    if (!snapTarget.value || !floatingConnector.value) {
      return Promise.reject(new Error("invalid state"));
    }

    const canContinue = await useNodeConfigurationStore().autoApplySettings({
      nextNodeId: snapTarget.value.parentNodeId,
    });

    if (!canContinue) {
      return Promise.reject(new Error("aborting connection"));
    }

    const targetPortDirection =
      floatingConnector.value.context.origin === "out" ? "in" : "out";

    if (!isPlaceholderPort(snapTarget.value)) {
      await nodeInteractionsStore.connectNodes(
        createConnectionPayload({
          sourceNodeId: floatingConnector.value.context.parentNodeId,
          sourcePortIndex: floatingConnector.value.context.portInstance.index,
          targetNodeId: snapTarget.value.parentNodeId,
          targetPortIndex: snapTarget.value.index,
          direction: targetPortDirection,
        }),
      );

      return Promise.resolve();
    }

    if (isPlaceholderPort(snapTarget.value)) {
      // eslint-disable-next-line no-use-before-define
      return connectViaPlaceHolderPort(targetPortDirection);
    }

    return Promise.reject(new Error("invalid state"));
  };

  async function connectViaPlaceHolderPort(
    targetPortDirection: "in" | "out",
  ): Promise<void> {
    // TS check
    if (
      !snapTarget.value ||
      !floatingConnector.value ||
      !activeSnapPosition.value
    ) {
      return Promise.reject(new Error("invalid state"));
    }

    const { validPortGroups } = snapTarget.value as SnappedPlaceholderPort;

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
        sourceNodeId: floatingConnector.value.context.parentNodeId,
        sourcePortIndex: floatingConnector.value.context.portInstance.index,
        targetNodeId: snapTarget.value.parentNodeId,
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
      nodeId: snapTarget.value.parentNodeId,
      props: {
        side: `${snapTarget.value.side}put` as const,
        position: activeSnapPosition.value,
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
              sourceNodeId: floatingConnector.value!.context.parentNodeId,
              sourcePortIndex:
                floatingConnector.value!.context.portInstance.index,
              targetNodeId: snapTarget.value!.parentNodeId,
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
