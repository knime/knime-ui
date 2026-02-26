import { computed, onMounted } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { freeSpaceInCanvas } from "@/lib/workflow-canvas";
import { getToastPresets } from "@/services/toastPresets";
import { useApplicationStore } from "@/store/application/application";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceUploadsStore } from "@/store/spaces/uploads";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeSize } from "@/style/shapes";

const cachedAncestorIds: string[] = [];

export const useAddNodeViaFileUpload = () => {
  const { toastPresets } = getToastPresets();
  const uploadsStore = useSpaceUploadsStore();
  const {
    uploadFiles,
    chooseFiles,
    setProcessingCompleted,
    setProcessingFailed,
  } = uploadsStore;

  const applicationStore = useApplicationStore();
  const { fileExtensionToNodeTemplateId } = applicationStore;

  const { activeProjectOrigin } = storeToRefs(applicationStore);

  // this is browser only and we need the parent folder
  // this should be fixed in the backend
  onMounted(() => {
    if (!activeProjectOrigin.value) {
      return;
    }
    if (cachedAncestorIds.length === 0) {
      useSpaceProvidersStore()
        .getAncestorInfo(activeProjectOrigin.value)
        .then(({ ancestorItemIds }) => {
          cachedAncestorIds.push(...ancestorItemIds);
        });
    }
  });

  // fallback to space root
  const parentId = computed(
    () => cachedAncestorIds[0] ?? activeProjectOrigin.value?.spaceId ?? "",
  );

  const getNodeTemplateId = (name: string) => {
    const sourceFileExtension = Object.keys(fileExtensionToNodeTemplateId).find(
      (extension) => name.endsWith(extension),
    );

    return fileExtensionToNodeTemplateId[sourceFileExtension ?? ""];
  };

  const accept = Object.keys(fileExtensionToNodeTemplateId).join(",");

  const showToastForUnsupportedFiles = (files: File[]) =>
    toastPresets.workflow.unsupportedNodeFromFile({
      names: files.map((file) => file.name),
    });

  // TODO HUB-12398: this is a hack and should be removed, the catalog
  // API should return the itemId of the uploaded file
  const getSpaceItemByName = async (name: string, itemId: string) => {
    const { spaceId, providerId } = activeProjectOrigin.value!;
    const files = await API.space.listWorkflowGroup({
      spaceProviderId: providerId,
      spaceId,
      itemId,
    });
    return files?.items.find((item) => item.name === name);
  };

  const filterSupportedFiles = (files: File[]) => [
    files.filter((file) => getNodeTemplateId(file.name)),
    files.filter((file) => !getNodeTemplateId(file.name)),
  ];

  const createAddNodeCallback = (position: XY) => {
    let counter = 0;
    return async ({ name, parentId, uploadId }) => {
      const uploadedFile = await getSpaceItemByName(name, parentId);

      if (!uploadedFile?.id) {
        consola.warn(
          "Uploaded file not found, its not added as node to the canvas",
        );
        return;
      }

      const nodeTemplateId = getNodeTemplateId(uploadedFile.name);

      const positionWithOffset = () => {
        const index = counter++;
        return {
          x: position.x + index * nodeSize * 2,
          y: position.y + index * nodeSize * 2,
        };
      };

      const { spaceId, providerId } = activeProjectOrigin.value!;

      try {
        await useNodeInteractionsStore().addNativeNode({
          position: positionWithOffset(),
          nodeFactory: { className: nodeTemplateId },
          spaceItemReference: {
            spaceId,
            providerId,
            itemId: uploadedFile.id,
          },
        });
        setProcessingCompleted({ uploadId });
      } catch (error) {
        setProcessingFailed({ uploadId });
        toastPresets.workflow.addNodeToCanvas({ error });
      }
    };
  };

  const importFilesViaDialog = async () => {
    const files = await chooseFiles({ options: { multiple: true, accept } });
    if (!files || files.length === 0) {
      return;
    }

    const [supportedFiles, unsupportedFiles] = filterSupportedFiles(files);
    if (unsupportedFiles.length > 0) {
      showToastForUnsupportedFiles(unsupportedFiles);
    }

    if (supportedFiles.length === 0) {
      return;
    }

    const center = freeSpaceInCanvas.aroundCenterWithFallback({
      visibleFrame: useCurrentCanvasStore().value.getVisibleFrame,
      nodes: useWorkflowStore().activeWorkflow!.nodes,
    });

    uploadFiles({
      files: supportedFiles,
      parentId: parentId.value,
      isFileWithProcessing: (_file) => true,
      completeCallback: createAddNodeCallback(center),
    });
  };

  const importFilesViaDrop = (droppedFiles: File[], dropPosition: XY) => {
    if (droppedFiles.length === 0) {
      return;
    }

    const [supportedFiles, unsupportedFiles] =
      filterSupportedFiles(droppedFiles);

    if (unsupportedFiles.length > 0) {
      showToastForUnsupportedFiles(unsupportedFiles);
    }

    if (supportedFiles.length === 0) {
      return;
    }

    uploadFiles({
      files: supportedFiles,
      parentId: parentId.value,
      isFileWithProcessing: (_file) => true,
      completeCallback: createAddNodeCallback(dropPosition),
    });
  };

  return {
    importFilesViaDialog,
    importFilesViaDrop,
  };
};
