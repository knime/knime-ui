import { computed, ref, type Ref } from "vue";
import { useRoute } from "vue-router";

import type { FileExplorerItem } from "webapps-common/ui/components/FileExplorer/types";
import { useStore } from "@/composables/useStore";
import { SpaceItem, type NodeTemplate } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes.mjs";
import { APP_ROUTES } from "@/router/appRoutes";

const isComponent = (nodeTemplateId: string | null, item: FileExplorerItem) => {
  return !nodeTemplateId && item.meta?.type === SpaceItem.TypeEnum.Component;
};

type UseCustomDragPreviewOptions = {
  projectId: Ref<string | null>;
};

export const useCustomDragPreview = (options: UseCustomDragPreviewOptions) => {
  const isAboveCanvas = ref(false);
  const hasDragEnded = ref(false);
  const nodeTemplate = ref<NodeTemplate | null>(null);
  const isFetchingTemplate = ref(false);

  const $route = useRoute();
  const store = useStore();

  // workflow
  const isWritable = computed(() => store.getters["workflow/isWritable"]);

  // spaces
  const activeSpacePath = computed(
    () => store.state.spaces.projectPath[options.projectId.value ?? ""],
  );

  // canvas
  const getScrollContainerElement = computed(
    () => store.state.canvas.getScrollContainerElement,
  );
  const screenToCanvasCoordinates = computed(
    () => store.getters["canvas/screenToCanvasCoordinates"],
  );

  // application
  const fileExtensionToNodeTemplateId = computed(
    () => store.state.application.fileExtensionToNodeTemplateId,
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
        inPorts: [],
        outPorts: [],
        type: item.meta?.type,
      };
    }

    const nodeTemplateId = getNodeTemplateId(item);

    return store.dispatch("nodeTemplates/getSingleNodeTemplate", {
      nodeTemplateId,
    });
  };

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
    const isItemAComponent = isComponent(nodeTemplateId, item);

    // when it doesn't have a template id and it's not a component
    // then it's just a random item that shouldn't have a preview
    if (!nodeTemplateId && !isItemAComponent) {
      return;
    }

    // check if item is above canvas
    const screenX = event.clientX - $shapes.nodeSize / 2;
    const screenY = event.clientY - $shapes.nodeSize / 2;

    const el = document.elementFromPoint(screenX, screenY);
    const kanvas = getScrollContainerElement.value();
    isAboveCanvas.value = kanvas.contains(el);

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

    const kanvas = getScrollContainerElement.value();

    if (!kanvas.contains(el)) {
      onComplete(false);
      return;
    }

    const nodeTemplateId = getNodeTemplateId(sourceItem);
    const isItemAComponent = isComponent(nodeTemplateId, sourceItem);

    if (!nodeTemplateId && !isItemAComponent) {
      onComplete(false);
      return;
    }

    try {
      const [x, y] = screenToCanvasCoordinates.value([screenX, screenY]);
      const position = { x, y };
      const spaceItemReference = {
        providerId: activeSpacePath.value.spaceProviderId,
        spaceId: activeSpacePath.value.spaceId,
        itemId: sourceItem.id,
      };

      await store.dispatch("workflow/addNode", {
        position,
        spaceItemReference,
        nodeFactory: isItemAComponent ? null : { className: nodeTemplateId },
        isComponent: isItemAComponent,
      });

      onComplete(true);
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
