/* eslint-disable no-undefined */
import { API } from "@api";
import { storeToRefs } from "pinia";

import {
  AddNodeCommand,
  type NodeFactoryKey,
  SpaceProvider,
  type XY,
} from "@/api/gateway-api/generated-api";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useSelectionStore } from "@/store/selection";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getToastPresets } from "@/toastPresets";
import { geometry } from "@/util/geometry";

export const useAddNodeToWorkflow = () => {
  const { isWritable, activeWorkflow } = storeToRefs(useWorkflowStore());
  const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
  const { toastPresets } = getToastPresets();

  const nodeInteractionsStore = useNodeInteractionsStore();

  const handleError = (error: unknown) => {
    consola.error({
      message: "Error adding node to canvas with auto-placement",
      error,
    });
    toastPresets.workflow.addNodeToCanvas({ error });
  };

  const addComponentByPosition = async (
    position: XY,
    payload: { id: string; name: string },
  ) => {
    if (!isWritable.value) {
      return;
    }

    const providerId = (() => {
      const providers = Object.values(spaceProviders.value ?? {});
      return (
        providers.find(({ type }) => type === SpaceProvider.TypeEnum.HUB)?.id ??
        providers[0]?.id ??
        "dummy-provider-id"
      );
    })();

    try {
      const { projectId, workflowId } =
        useWorkflowStore().getProjectAndWorkflowIds;

      await API.workflowCommand.AddComponent({
        projectId,
        workflowId,
        providerId,
        // omitting space ID
        itemId: payload.id ?? "dummy-item-id",
        position,
        name: payload.name ?? "Dummy Component",
      });
    } catch (error) {
      handleError(error);
    }
  };

  const addNodeByPosition = async (
    position: XY,
    nodeFactory: NodeFactoryKey,
    autoConnectOptions?: {
      sourceNodeId: string;
      nodeRelation: AddNodeCommand.NodeRelationEnum;
    },
  ) => {
    try {
      await nodeInteractionsStore.addNode({
        position,
        nodeFactory,
        sourceNodeId: autoConnectOptions?.sourceNodeId,
        nodeRelation: autoConnectOptions?.nodeRelation,
      });
    } catch (error) {
      handleError(error);
    }
  };

  const addNodeWithAutoPositioning = async (nodeFactory: NodeFactoryKey) => {
    // do not try to add a node to a read only workflow
    if (!isWritable.value) {
      return;
    }

    const { singleSelectedNode } = storeToRefs(useSelectionStore());
    const canvasStore = useCurrentCanvasStore();

    const position = singleSelectedNode.value
      ? {
          // eslint-disable-next-line no-magic-numbers
          x: singleSelectedNode.value.position.x + 120,
          y: singleSelectedNode.value.position.y,
        }
      : geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: canvasStore.value.getVisibleFrame,
          nodes: activeWorkflow.value!.nodes,
        });

    const autoConnectOptions = singleSelectedNode.value
      ? {
          sourceNodeId: singleSelectedNode.value.id,
          nodeRelation: AddNodeCommand.NodeRelationEnum.SUCCESSORS,
        }
      : undefined;

    await addNodeByPosition(position, nodeFactory, autoConnectOptions);
  };

  return {
    addNodeByPosition,
    addNodeWithAutoPositioning,
    addComponentByPosition,
  };
};
