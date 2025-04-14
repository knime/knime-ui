import { watch } from "vue";
import { storeToRefs } from "pinia";

import { useApplicationStore } from "@/store/application/application";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowVersionsStore } from "@/store/workflow/workflowVersions";

export const useUploadToSpace = () => {
  const versionsStore = useWorkflowVersionsStore();
  const { uploadToSpace } = useSpacesStore();
  const { openProject } = useSpaceOperationsStore();
  const { activeProjectId } = storeToRefs(useApplicationStore());
  const desktopInteractionsStore = useDesktopInteractionsStore();

  const uploadAndOpenProject = async (itemId: string) => {
    const uploadResult = await uploadToSpace({
      itemIds: [itemId],
    });

    if (uploadResult) {
      await openProject({
        providerId: uploadResult.destinationProviderId,
        spaceId: uploadResult.destinationSpaceId,
        itemId: uploadResult.remoteItemIds[0],
      });

      // activeProjectId can take a while to update
      const stopWatcher = watch(
        () => activeProjectId.value,
        async () => {
          stopWatcher();
          await versionsStore.activateVersionsMode();
        },
      );
      desktopInteractionsStore.closeProject(activeProjectId.value!);
    }
  };

  return { uploadAndOpenProject };
};
