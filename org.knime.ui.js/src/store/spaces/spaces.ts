import { API } from "@api";
import { defineStore } from "pinia";

import {
  type DestinationPickerConfig,
  useDestinationPicker,
} from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { checkOpenWorkflowsBeforeMove } from "@/store/spaces/util";

import { useSpaceCachingStore } from "./caching";
import { useSpaceOperationsStore } from "./spaceOperations";

const { promptDestination } = useDestinationPicker();

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
      queryString,
    }: {
      projectId: string;
      itemId: string;
      queryString?: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      API.desktop.openInBrowser({
        spaceProviderId,
        spaceId,
        itemId,
        queryString,
      });
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
