import { API } from "@api";
import { defineStore } from "pinia";

import type { NameCollisionHandling } from "@/api/custom-types";
import {
  type DestinationPickerConfig,
  useDestinationPicker,
} from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { usePromptCollisionStrategies } from "@/composables/useConfirmDialog/usePromptCollisionHandling";

import { localRootProjectPath, useSpaceCachingStore } from "./caching";
import { useSpaceOperationsStore } from "./spaceOperations";

const { promptDestination, presets } = useDestinationPicker();
const { promptCollisionStrategies } = usePromptCollisionStrategies();

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
      const { spaceId: sourceSpaceId, spaceProviderId: sourceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      const pickerConfig =
        sourceProviderId === localRootProjectPath.spaceProviderId
          ? presets.UPLOAD_PICKERCONFIG
          : presets.DOWNLOAD_PICKERCONFIG;
      const destinationResult = await promptDestination(pickerConfig);

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

    async moveOrCopyToSpace({
      projectId,
      isCopy,
      itemIds,
    }: {
      projectId: string;
      isCopy: boolean;
      itemIds: string[];
    }) {
      const { spaceId: sourceSpaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

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
        const doWithCollisionHandling = (
          strategy: NameCollisionHandling | null,
        ) => {
          return API.desktop.moveOrCopyToSpace({
            spaceProviderId,
            sourceSpaceId,
            isCopy,
            sourceItemIds: itemIds,
            destinationSpaceId: destinationResult.spaceId,
            destinationItemId: destinationResult.itemId,
            nameCollisionHandling: strategy,
          });
        };

        let result = await doWithCollisionHandling(null);

        if (result === "COLLISION") {
          const strategy = await promptCollisionStrategies();
          result = await doWithCollisionHandling(strategy);
        }

        if (result === "SUCCESS") {
          await useSpaceOperationsStore().fetchWorkflowGroupContent({
            projectId,
          });
        }
      } catch (error) {
        consola.error(
          `action::moveOrCopyToSpace -> Error ${
            isCopy ? "copying" : "moving"
          } items`,
          { error },
        );
        throw error;
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
