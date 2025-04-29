import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import type { NameCollisionHandling } from "@/api/custom-types";
import {
  type DestinationPickerConfig,
  useDestinationPicker,
} from "@/components/spaces/DestinationPicker/useDestinationPicker";
import { usePromptCollisionStrategies } from "@/composables/useConfirmDialog/usePromptCollisionHandling";
import { showErrorToast } from "@/util/errorHandling";
import type { RootStoreState } from "../types";

import * as auth from "./auth";
import * as caching from "./caching";
import * as deployments from "./deployments";
import * as providers from "./providers";
import * as spaceOperations from "./spaceOperations";

interface CreateWorkflowModalConfig {
  isOpen: boolean;
  projectId: string | null;
}

interface DeploymentsModalConfig {
  isOpen: boolean;
  name: string;
  projectId: string;
  itemId: string;
}

export * from "./common";
export * from "./types";

export interface SpacesState {
  createWorkflowModalConfig: CreateWorkflowModalConfig;
  deploymentsModalConfig: DeploymentsModalConfig;
}

const { promptDestination, presets } = useDestinationPicker();
const { promptCollisionStrategies } = usePromptCollisionStrategies();

export const state = (): SpacesState => ({
  ...auth.state(),
  ...caching.state(),
  ...providers.state(),
  ...spaceOperations.state(),
  ...deployments.state(),

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
});

export const mutations: MutationTree<SpacesState> = {
  ...auth.mutations,
  ...caching.mutations,
  ...providers.mutations,
  ...spaceOperations.mutations,
  ...deployments.mutations,

  setCreateWorkflowModalConfig(state, value: CreateWorkflowModalConfig) {
    state.createWorkflowModalConfig = value;
  },

  setDeploymentsModalConfig(state, value: DeploymentsModalConfig) {
    state.deploymentsModalConfig = value;
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  ...auth.actions,
  ...caching.actions,
  ...providers.actions,
  ...spaceOperations.actions,
  ...deployments.actions,

  async copyBetweenSpaces({ state }, { projectId, itemIds }) {
    const { spaceId: sourceSpaceId, spaceProviderId: sourceProviderId } =
      state.projectPath[projectId];

    const isUpload =
      sourceProviderId === caching.localRootProjectPath.spaceProviderId;

    const pickerConfig = isUpload
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

  async moveOrCopyToSpace({ state, dispatch }, { projectId, isCopy, itemIds }) {
    const { spaceId: sourceSpaceId, spaceProviderId } =
      state.projectPath[projectId];

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
        await dispatch("fetchWorkflowGroupContent", { projectId });
      }
    } catch (error) {
      showErrorToast({
        headline: `Error ${isCopy ? "copying" : "moving"} items`,
        problemDetails: {
          title: "The operation failed unexpectedly.",
        },
        error,
      });
    }
  },

  openInBrowser({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openInBrowser({ spaceProviderId, spaceId, itemId });
  },

  openAPIDefinition({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openAPIDefinition({ spaceProviderId, spaceId, itemId });
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  ...auth.getters,
  ...caching.getters,
  ...providers.getters,
  ...spaceOperations.getters,
};
