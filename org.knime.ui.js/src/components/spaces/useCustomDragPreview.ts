import { type Ref, computed, ref } from "vue";
import { useRoute } from "vue-router";

import type { FileExplorerItem } from "@knime/components";

import { type NodeTemplate, SpaceItem } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { APP_ROUTES } from "@/router/appRoutes";
import * as $shapes from "@/style/shapes";

const isComponent = (nodeFactoryId: string | null, item: FileExplorerItem) => {
  return !nodeFactoryId && item.meta?.type === SpaceItem.TypeEnum.Component;
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
  const fileExtensionToNodeFactoryId = computed(
    () => store.state.application.fileExtensionToNodeFactoryId,
  );

  const getNodeFactoryId = (sourceItem: FileExplorerItem) => {
    const sourceFileExtension = Object.keys(
      fileExtensionToNodeFactoryId.value,
    ).find((extension) => sourceItem.name.endsWith(extension));

    return fileExtensionToNodeFactoryId.value[sourceFileExtension ?? ""];
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

    const nodeFactoryId = getNodeFactoryId(item);

    return store.dispatch("nodeTemplates/getSingleNodeTemplate", {
      nodeFactoryId,
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
    const nodeFactoryId = getNodeFactoryId(item);
    const isItemAComponent = isComponent(nodeFactoryId, item);

    // when it doesn't have a template id and it's not a component
    // then it's just a random item that shouldn't have a preview
    if (!nodeFactoryId && !isItemAComponent) {
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

    const nodeFactoryId = getNodeFactoryId(sourceItem);
    const isItemAComponent = isComponent(nodeFactoryId, sourceItem);

    if (!nodeFactoryId && !isItemAComponent) {
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
        nodeFactory: isItemAComponent ? null : { className: nodeFactoryId },
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
