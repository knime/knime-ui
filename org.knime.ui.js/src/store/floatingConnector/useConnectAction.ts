/* eslint-disable func-style */
/* eslint-disable no-undefined */
import type { Ref } from "vue";

import type { Direction } from "@/util/compatibleConnections";
import { useNodeConfigurationStore } from "../nodeConfiguration/nodeConfiguration";
import { useNodeInteractionsStore } from "../workflow/nodeInteractions";

import {
  type FloatingConnector,
  type SnapTarget,
  type SnappedPlaceholderPort,
  isPlaceholderPort,
} from "./types";

type UseConnectActionOptions = {
  floatingConnector: Ref<FloatingConnector | undefined>;
  snapTarget: Ref<SnapTarget | undefined>;
};

export const useConnectAction = (options: UseConnectActionOptions) => {
  const { floatingConnector, snapTarget } = options;

  const nodeInteractionsStore = useNodeInteractionsStore();

  const createConnectionPayload = (params: {
    dragSourceNode: string;
    dragSourcePort: number;
    targetedNode: string;
    snapTarget: number;
    direction: Direction;
  }) => {
    const {
      dragSourceNode,
      dragSourcePort,
      targetedNode,
      snapTarget,
      direction,
    } = params;

    return direction === "in"
      ? {
          sourceNode: dragSourceNode,
          sourcePort: dragSourcePort,
          destNode: targetedNode,
          destPort: snapTarget,
        }
      : {
          sourceNode: targetedNode,
          sourcePort: snapTarget,
          destNode: dragSourceNode,
          destPort: dragSourcePort,
        };
  };

  /**
   * Completes the connection interaction. This function can either connect to an
   * already existing port; or, in case of a placeholder port, add a new port
   * and then connect to it
   */
  const finishConnection = async () => {
    // check for proper TS inference; shouldn't happen
    if (!snapTarget.value || !floatingConnector.value) {
      return;
    }

    const canContinue = await useNodeConfigurationStore().autoApplySettings({
      nextNodeId: snapTarget.value.parentNodeId,
    });

    if (!canContinue) {
      return;
    }

    const targetPortDirection =
      floatingConnector.value.context.origin === "out" ? "in" : "out";

    if (!isPlaceholderPort(snapTarget.value)) {
      await nodeInteractionsStore.connectNodes(
        createConnectionPayload({
          dragSourceNode: floatingConnector.value.context.parentNodeId,
          dragSourcePort: floatingConnector.value.context.portInstance.index,
          targetedNode: snapTarget.value.parentNodeId,
          snapTarget: snapTarget.value.index,
          direction: targetPortDirection,
        }),
      );
    }

    if (isPlaceholderPort(snapTarget.value)) {
      // eslint-disable-next-line no-use-before-define
      await connectViaPlaceHolderPort(targetPortDirection);
    }
  };

  async function connectViaPlaceHolderPort(targetPortDirection: "in" | "out") {
    // TS check
    if (!snapTarget.value || !floatingConnector.value) {
      return;
    }

    const { validPortGroups } = snapTarget.value as SnappedPlaceholderPort;

    if (!validPortGroups) {
      return;
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

      const { newPortIdx } = await nodeInteractionsStore.addNodePort({
        nodeId: snapTarget.value.parentNodeId,
        side: targetPortDirection === "in" ? "input" : "output",
        typeId,
        portGroup: firstPortGroup === "default" ? undefined : firstPortGroup,
      });

      await nodeInteractionsStore.connectNodes(
        createConnectionPayload({
          dragSourceNode: floatingConnector.value.context.parentNodeId,
          dragSourcePort: floatingConnector.value.context.portInstance.index,
          targetedNode: snapTarget.value.parentNodeId,
          snapTarget: newPortIdx,
          direction: targetPortDirection,
        }),
      );
    }

    // TODO: Otherwise open the Port Type Menu so that user can select
  }

  return { finishConnection };
};
