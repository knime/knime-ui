import { storeToRefs } from "pinia";

import { useApplicationStore } from "@/store/application/application";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpaceUploadsStore } from "@/store/spaces/uploads";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";

export const useUploadWorkflowToSpace = () => {
  const { moveToHubFromLocalProvider } = useSpaceUploadsStore();
  const { openProject } = useSpaceOperationsStore();
  const { activeProjectId } = storeToRefs(useApplicationStore());
  const desktopInteractionsStore = useDesktopInteractionsStore();

  /**
   * Uploads a workflow to a hub space and opens it as a new project
   *
   * @param itemId - the itemId of the workflow in the local space
   */
  const uploadWorkflowAndOpenAsProject = async (itemId: string) => {
    const uploadResult = await moveToHubFromLocalProvider({
      itemIds: [itemId],
    });

    if (uploadResult) {
      await openProject({
        providerId: uploadResult.destinationProviderId,
        spaceId: uploadResult.destinationSpaceId,
        itemId: uploadResult.remoteItemIds[0],
      });

      await desktopInteractionsStore.closeProject(activeProjectId.value!);
    }
  };

  return { uploadWorkflowAndOpenAsProject };
};
