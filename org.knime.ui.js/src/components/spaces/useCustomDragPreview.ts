/* eslint-disable no-undefined */
import { type Ref, computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";

import type { FileExplorerItem } from "@knime/components";

import { useAnalyticsService } from "@/analytics";
import { Node, SpaceItem } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import { getKanvasDomElement } from "@/util/workflow-canvas";

const isComponent = (item: FileExplorerItem) => {
  return item.meta?.type === SpaceItem.TypeEnum.Component;
};

type UseCustomDragPreviewOptions = {
  projectId: Ref<string | null>;
};

/**
 * Handles items being dragged from the SpaceExplorer into the canvas. Because
 * some of these items could be either files that can be added immediately as nodes
 * or could be components in the space. Both cases would result in content that can
 * be added to the canvas which needs to be handled accordingly
 */
export const useCustomDragPreview = (options: UseCustomDragPreviewOptions) => {
  const isAboveCanvas = ref(false);
  const hasDragEnded = ref(false);

  const isFetchingTemplate = ref(false);

  const { isWritable } = storeToRefs(useWorkflowStore());
  const { projectPath } = storeToRefs(useSpaceCachingStore());
  const canvasStore = useCurrentCanvasStore();
  const { fileExtensionToNodeTemplateId } = storeToRefs(useApplicationStore());
  const { getSingleNodeTemplate } = useNodeTemplatesStore();
  const nodeInteractionStore = useNodeInteractionsStore();
  const $route = useRoute();

  const activeSpacePath = computed(
    () => projectPath.value[options.projectId.value ?? ""],
  );

  const getNodeTemplateId = (sourceItem: FileExplorerItem) => {
    const sourceFileExtension = Object.keys(
      fileExtensionToNodeTemplateId.value,
    ).find((extension) => sourceItem.name.endsWith(extension));

    return fileExtensionToNodeTemplateId.value[sourceFileExtension ?? ""];
  };

  const createNodeTemplatePreview = (
    item: FileExplorerItem,
    isComponent: boolean,
  ) => {
    if (isComponent) {
      return {
        isComponent: true,
        inPorts: [] as any[],
        outPorts: [] as any[],
        type: item.meta?.type,
        icon: undefined,
      };
    }

    const nodeTemplateId = getNodeTemplateId(item);
    return getSingleNodeTemplate({
      nodeTemplateId,
    });
  };

  const nodeTemplate =
    ref<Awaited<ReturnType<typeof createNodeTemplatePreview>>>(null);

  const onDrag = async ({
    event,
    item,
  }: {
    event: DragEvent;
    item: FileExplorerItem;
  }) => {
    // reset state on subsequent drags
    hasDragEnded.value = false;
    const nodeTemplateId = getNodeTemplateId(item);
    const isItemAComponent = isComponent(item);

    // when it doesn't have a template id and it's not a component
    // then it's just a random item that shouldn't have a preview
    if (!nodeTemplateId && !isItemAComponent) {
      return;
    }

    // check if item is above canvas
    const screenX = event.clientX - $shapes.nodeSize / 2;
    const screenY = event.clientY - $shapes.nodeSize / 2;

    const el = document.elementFromPoint(screenX, screenY);
    const kanvas = getKanvasDomElement();
    isAboveCanvas.value = kanvas?.contains(el) ?? false;

    // make sure the preview is only fetched once for this current drag interaction
    if (!isFetchingTemplate.value) {
      isFetchingTemplate.value = true;
      nodeTemplate.value = await createNodeTemplatePreview(
        item,
        isItemAComponent,
      );
    }
  };

  const onDragEnd = async ({
    event,
    sourceItem,
    onComplete,
  }: {
    event: DragEvent;
    sourceItem: FileExplorerItem;
    onComplete: (isSuccessful: boolean) => void;
  }) => {
    hasDragEnded.value = true;
    isAboveCanvas.value = false;
    nodeTemplate.value = null;
    isFetchingTemplate.value = false;

    const screenX = event.clientX - $shapes.nodeSize / 2;
    const screenY = event.clientY - $shapes.nodeSize / 2;

    const el = document.elementFromPoint(screenX, screenY);

    // skip behavior when not on the workflow or workflow is not writable
    if ($route.name !== APP_ROUTES.WorkflowPage || !isWritable.value) {
      onComplete(false);
      return;
    }

    const kanvas = getKanvasDomElement()!;

    if (!kanvas.contains(el)) {
      onComplete(false);
      return;
    }

    const nodeTemplateId = getNodeTemplateId(sourceItem);
    const isItemAComponent = isComponent(sourceItem);

    if (!nodeTemplateId && !isItemAComponent) {
      onComplete(false);
      return;
    }

    try {
      const [x, y] = canvasStore.value.screenToCanvasCoordinates([
        screenX,
        screenY,
      ]);
      const position = { x, y };

      const addNode = async () => {
        const spaceItemReference = {
          providerId: activeSpacePath.value.spaceProviderId,
          spaceId: activeSpacePath.value.spaceId,
          itemId: sourceItem.id,
        };

        if (isItemAComponent) {
          return nodeInteractionStore.importComponentNode({
            position,
            spaceItemReference,
            componentName: sourceItem.name,
          });
        } else {
          const { newNodeId } = await nodeInteractionStore.addNativeNode({
            position,
            spaceItemReference,
            nodeFactory: { className: nodeTemplateId },
          });

          const node = nodeInteractionStore.getNodeById(newNodeId ?? "");

          if (node) {
            useAnalyticsService().track("node_created", {
              via: "explorer_dragdrop_",
              nodeId: node.id,
              nodeFactoryId: nodeTemplateId,
              nodeType: Node.KindEnum.Node,
            });
          }

          return { newNodeId };
        }
      };

      const { newNodeId } = await addNode();
      onComplete(Boolean(newNodeId));
    } catch (error) {
      onComplete(false);
      consola.error({
        message: "Error adding node via file to workflow",
        error,
      });

      getToastPresets().toastPresets.workflow.addNodeToCanvas({ error });
    }
  };

  const shouldShowCustomPreview = computed(
    () => !hasDragEnded.value && nodeTemplate.value && isAboveCanvas.value,
  );

  return { shouldShowCustomPreview, nodeTemplate, onDrag, onDragEnd };
};
