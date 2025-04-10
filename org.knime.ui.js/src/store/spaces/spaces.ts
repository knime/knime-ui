import { shallowRef } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";
import { useRouter } from "vue-router";

import ListIcon from "@knime/styles/img/icons/list-thumbs.svg";

import {
  type DestinationPickerConfig,
  useDestinationPicker,
} from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { useRevealInSpaceExplorer } from "@/components/spaces/useRevealInSpaceExplorer";
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
    }: {
      itemIds: string[];
      openAfterUpload?: boolean;
    }) {
      const destinationResult = await promptDestination(
        presets.UPLOAD_PICKERCONFIG,
      );

      if (destinationResult?.type === "item") {
        const {
          spaceProviderId: destinationProviderId,
          spaceId: destinationSpaceId,
          itemId: destinationItemId,
          resetWorkflow,
        } = destinationResult;

        const remoteItemIds = await API.desktop.copyBetweenSpaces({
          sourceProviderId: localRootProjectPath.spaceProviderId,
          sourceSpaceId: localRootProjectPath.spaceId,
          sourceItemIds: itemIds,
          destinationProviderId,
          destinationSpaceId,
          destinationItemId,
          excludeData: resetWorkflow,
        });
        console.log("openAfterUpload", { remoteItemIds });

        const $toast = getToastsProvider();
        if (!remoteItemIds) {
          $toast.show({
            headline: "Upload Failed",
            message: "Failed to upload, check logs for details.",
            type: "error",
          });
          return;
        }

        if (!openAfterUpload) {
          const { revealInSpaceExplorer } = useRevealInSpaceExplorer();
          console.log("revealInSpaceExplorer after upload");
          $toast.show({
            headline: "Upload complete",
            type: "success",
            buttons: [
              {
                // @ts-expect-error
                icon: shallowRef(ListIcon),
                text: "Reveal in space explorer",
                callback: () => {
                  revealInSpaceExplorer({
                    providerId: destinationProviderId,
                    spaceId: destinationSpaceId,
                    itemId: remoteItemIds[0], // TODO change me when there are multiple items
                  });
                },
              },
            ],
          });
          return;
        }

        if (remoteItemIds.length === 1) {
          const { activeProjectId } = useApplicationStore();
          await useDesktopInteractionsStore().closeProject(activeProjectId!);
          const { openProject } = useSpaceOperationsStore();
          await openProject({
            providerId: destinationProviderId,
            spaceId: destinationSpaceId,
            itemId: remoteItemIds[0],
            $router,
          });
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
