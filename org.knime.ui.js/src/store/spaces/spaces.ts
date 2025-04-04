import { API } from "@api";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

import {
  type DestinationPickerConfig,
  useDestinationPicker,
} from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { getToastsProvider } from "@/plugins/toasts";
import { checkOpenWorkflowsBeforeMove } from "@/store/spaces/util";
import { useApplicationStore } from "../application/application";
import { useDesktopInteractionsStore } from "../workflow/desktopInteractions";

import { localRootProjectPath, useSpaceCachingStore } from "./caching";
import { useSpaceOperationsStore } from "./spaceOperations";

const { promptDestination, presets } = useDestinationPicker();
// const { fetchWorkflowGroupContentByIdTriplet } = useSpaceOperationsStore();

const $router = useRouter();

type CreateWorkflowModalConfig = {
  isOpen: boolean;
  projectId: string | null;
};

type DeploymentsModalConfig = {
  isOpen: boolean;
  name: string;
  projectId: string;
  itemId: string;
};

export interface SpacesState {
  createWorkflowModalConfig: CreateWorkflowModalConfig;
  deploymentsModalConfig: DeploymentsModalConfig;
}

export const useSpacesStore = defineStore("spaces", {
  state: (): SpacesState => ({
    // modal open state
    createWorkflowModalConfig: {
      isOpen: false,
      projectId: null,
    },
    deploymentsModalConfig: {
      isOpen: false,
      name: "",
      projectId: "",
      itemId: "",
    },
  }),
  actions: {
    setCreateWorkflowModalConfig(
      createWorkflowModalConfig: CreateWorkflowModalConfig,
    ) {
      this.createWorkflowModalConfig = createWorkflowModalConfig;
    },

    setDeploymentsModalConfig(deploymentsModalConfig: DeploymentsModalConfig) {
      this.deploymentsModalConfig = deploymentsModalConfig;
    },

    async copyBetweenSpaces({
      projectId,
      itemIds,
    }: {
      projectId: string;
      itemIds: string[];
    }) {
      // Takes space context from space explorer
      const { spaceId: sourceSpaceId, spaceProviderId: sourceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      console.log("copyBetweenSpaces", {
        projectId,
        itemIds,
        sourceSpaceId,
        localRootProjectPath: localRootProjectPath.spaceProviderId,
      });

      const pickerConfig =
        sourceProviderId === localRootProjectPath.spaceProviderId
          ? presets.UPLOAD_PICKERCONFIG
          : presets.DOWNLOAD_PICKERCONFIG;
      const destinationResult = await promptDestination(pickerConfig);

      console.log(destinationResult);

      if (destinationResult?.type === "item") {
        const {
          spaceProviderId: destinationProviderId,
          spaceId: destinationSpaceId,
          itemId: destinationItemId,
          resetWorkflow,
        } = destinationResult;

        API.desktop.copyBetweenSpaces({
          sourceProviderId,
          sourceSpaceId,
          sourceItemIds: itemIds,
          destinationProviderId,
          destinationSpaceId,
          destinationItemId,
          excludeData: resetWorkflow,
        });
      }
    },

    async uploadToSpace({
      itemIds,
      openAfterUpload = false,
      name, // TODO delete me, should not be needed
    }: {
      itemIds: string[];
      openAfterUpload?: boolean;
      name?: string; // TODO delete me, should not be needed
    }) {
      const destinationResult = await promptDestination(
        presets.UPLOAD_PICKERCONFIG,
      );
      console.log("uploadToSpace", {
        itemIds,
        openAfterUpload,
        destinationResult,
      });

      if (destinationResult?.type === "item") {
        const {
          spaceProviderId: destinationProviderId,
          spaceId: destinationSpaceId,
          itemId: destinationItemId,
          resetWorkflow,
        } = destinationResult;

        const isUploadSuccessful = await API.desktop.copyBetweenSpaces({
          sourceProviderId: localRootProjectPath.spaceProviderId,
          sourceSpaceId: localRootProjectPath.spaceId,
          sourceItemIds: itemIds,
          destinationProviderId,
          destinationSpaceId,
          destinationItemId,
          excludeData: resetWorkflow,
        });
        console.log("openAfterUpload", { isUploadSuccessful });

        const $toast = getToastsProvider();
        if (!isUploadSuccessful) {
          $toast.show({
            headline: "Upload Failed",
            message: "Failed to upload, check logs for details.",
            type: "error",
          });
          return;
        }

        if (!openAfterUpload) {
          $toast.show({
            headline: "Upload complete",
            type: "success",
            // buttons: // Add a button to open the remote workflow, only when is a single one
          });
          return;
        }

        if (itemIds.length === 1) {
          // TODO This is a workaround for the fact that the API does not return the new itemId
          // this will fail in case of a name collision and if the user chooses to use another name
          const workflowGroup = await API.space.listWorkflowGroup({
            spaceProviderId: destinationProviderId,
            spaceId: destinationSpaceId,
            itemId: destinationItemId,
          });
          console.log("remoteContent", { workflowGroup });
          const { activeProjectId } = useApplicationStore();
          console.log("activeProjectId", { activeProjectId });
          const { openProject } = useSpaceOperationsStore();
          await openProject({
            providerId: destinationProviderId,
            spaceId: destinationSpaceId,
            itemId: workflowGroup.items.find(
              (remoteWorkflow) => remoteWorkflow.name === name,
            )!.id,
            $router,
          });
          console.log("activeProjectId", { activeProjectId });
          useDesktopInteractionsStore().closeProject(activeProjectId!);
        }
      }
    },

    async moveOrCopyToSpace({
      projectId,
      isCopy,
      itemIds,
    }: {
      projectId: string;
      isCopy: boolean;
      itemIds: string[];
    }) {
      if (checkOpenWorkflowsBeforeMove({ itemIds, isCopy })) {
        // can't move workflows that are currently open
        return;
      }

      const { spaceId: sourceSpaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      const {
        setIsLoadingContent,
        fetchWorkflowGroupContent,
        checkForCollisionsAndMove,
      } = useSpaceOperationsStore();

      const operation = isCopy ? "Copy" : "Move";
      const pickerConfig = {
        title: `${operation} to...`,
        description: "Select a destination:",
        validate(selection) {
          return selection?.type === "item" && selection.isWorkflowContainer
            ? { valid: true }
            : { valid: false };
        },
        spaceProviderRules: { restrictedTo: [spaceProviderId] },
      } satisfies DestinationPickerConfig;
      const destinationResult = await promptDestination(pickerConfig);

      if (!destinationResult || destinationResult.type !== "item") {
        return;
      }

      try {
        setIsLoadingContent(true);

        await checkForCollisionsAndMove({
          spaceProviderId,
          spaceId: sourceSpaceId,
          itemIds,
          destSpaceId: destinationResult.spaceId,
          destWorkflowGroupItemId: destinationResult.itemId,
          copy: isCopy,
        });

        await fetchWorkflowGroupContent({
          projectId,
        });
      } catch (error: unknown) {
        consola.error(
          `action::moveOrCopyToSpace -> Error ${
            isCopy ? "copying" : "moving"
          } items`,
          { error },
        );

        throw error;
      } finally {
        setIsLoadingContent(false);
      }
    },

    openInBrowser({
      projectId,
      itemId,
    }: {
      projectId: string;
      itemId: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      API.desktop.openInBrowser({ spaceProviderId, spaceId, itemId });
    },

    openAPIDefinition({
      projectId,
      itemId,
    }: {
      projectId: string;
      itemId: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      API.desktop.openAPIDefinition({ spaceProviderId, spaceId, itemId });
    },
  },
});
