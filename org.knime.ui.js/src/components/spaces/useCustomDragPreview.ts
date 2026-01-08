/* eslint-disable no-undefined */
import { type Ref, computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";

import type { FileExplorerItem } from "@knime/components";

import { SpaceItem } from "@/api/gateway-api/generated-api";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { getKanvasDomElement } from "@/util/workflow-canvas";

const isComponent = (item: FileExplorerItem) => {
  return item.meta?.type === SpaceItem.TypeEnum.Component;
};

type UseCustomDragPreviewOptions = {
  projectId: Ref<string | null>;
};

export const useCustomDragPreview = (options: UseCustomDragPreviewOptions) => {
  const isAboveCanvas = ref(false);
  const hasDragEnded = ref(false);

  const isFetchingTemplate = ref(false);

  const { isWritable } = storeToRefs(useWorkflowStore());
  const { projectPath } = storeToRefs(useSpaceCachingStore());
  const canvasStore = useCurrentCanvasStore();
  const { fileExtensionToNodeTemplateId } = storeToRefs(useApplicationStore());
  const { getSingleNodeTemplate } = useNodeTemplatesStore();
  const { addNode } = useNodeInteractionsStore();
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
      const spaceItemReference = {
        providerId: activeSpacePath.value.spaceProviderId,
        spaceId: activeSpacePath.value.spaceId,
        itemId: sourceItem.id,
      };

      const { newNodeId, problem } = await addNode({
        position,
        spaceItemReference,
        nodeFactory: isItemAComponent
          ? undefined
          : { className: nodeTemplateId },
        componentName: isItemAComponent ? sourceItem.name : undefined,
      });

      if (problem) {
        const $toast = getToastsProvider();
        $toast.show({
          type: problem.type,
          headline: problem.headline,
          message: problem.message,
          autoRemove: true,
        });
      }
      onComplete(Boolean(newNodeId));
    } catch (error) {
      onComplete(false);
      consola.error({
        message: "Error adding node via file to workflow",
        error,
      });
      throw error;
    }
  };

  const shouldShowCustomPreview = computed(
    () => !hasDragEnded.value && nodeTemplate.value && isAboveCanvas.value,
  );

  return { shouldShowCustomPreview, nodeTemplate, onDrag, onDragEnd };
};
