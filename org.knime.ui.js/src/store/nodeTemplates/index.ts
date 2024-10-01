import type { ActionTree, MutationTree } from "vuex";

import { API } from "@/api";
import type {
  AvailablePortTypes,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";
import type { RootStoreState } from "../types";
import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";

const uniqueStrings = (input: string[]) => [...new Set(input)];

type NodeTemplateDictionary = Record<string, NodeTemplateWithExtendedPorts>;

export interface NodeTemplatesState {
  /**
   * Cache of node templates. Used to render the node icon previews,
   * as well as holding port information
   */
  cache: NodeTemplateDictionary;

  isDraggingNodeTemplate: boolean;
  draggedTemplateData: NodeTemplateWithExtendedPorts | null;
}

export const state = (): NodeTemplatesState => ({
  cache: {},

  isDraggingNodeTemplate: false,
  draggedTemplateData: null,
});

export const mutations: MutationTree<NodeTemplatesState> = {
  updateCache(state, newValues) {
    state.cache = {
      ...state.cache,
      ...newValues,
    };
  },

  setIsDraggingNodeTemplate(state, value) {
    state.isDraggingNodeTemplate = value;
  },

  setDraggedTemplateData(state, value) {
    state.draggedTemplateData = value;
  },
};

type StringProperties<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

const arrayToDictionary = <T, K extends StringProperties<T>>(
  array: T[],
  key: K,
): Record<string, T> => {
  return Object.fromEntries(
    // map to key-value pairs
    array.map((value) => [value[key], value]),
  );
};

const toNodeTemplateDictionary = (
  availablePortTypes: AvailablePortTypes,
  nodeTemplates: Record<string, NodeTemplate>,
): NodeTemplateDictionary => {
  return arrayToDictionary(
    Object.values(nodeTemplates)
      // add expanded port information
      .map(toNodeTemplateWithExtendedPorts(availablePortTypes)),
    "id",
  );
};

export const actions: ActionTree<NodeTemplatesState, RootStoreState> = {
  async getSingleNodeTemplate({ dispatch }, { nodeTemplateId }) {
    const { found, missing } = (await dispatch("getNodeTemplates", {
      nodeTemplateIds: [nodeTemplateId],
    })) as {
      found: Record<string, NodeTemplateWithExtendedPorts>;
      missing: string[];
    };

    if (missing.length > 0) {
      return {};
    }

    return found[nodeTemplateId];
  },

  async getNodeTemplates(
    { state, commit, rootState },
    { nodeTemplateIds }: { nodeTemplateIds: string[] },
  ) {
    const idsToDictionary = (): NodeTemplateDictionary => {
      return Object.fromEntries(
        nodeTemplateIds
          .filter((id) => state.cache[id])
          .map((id) => [id, state.cache[id]]),
      );
    };

    // remove possibly repeated values
    const uniqueNodeTemplateIds = uniqueStrings(nodeTemplateIds);

    const uncachedTemplateIds = uniqueNodeTemplateIds.filter(
      (id) => !state.cache[id],
    );

    // every value is already cached, which also means no template id is missing
    if (uncachedTemplateIds.length === 0) {
      return { found: idsToDictionary(), missing: [] };
    }

    const nodeTemplates = await API.noderepository.getNodeTemplates({
      nodeTemplateIds: uncachedTemplateIds,
    });

    const { availablePortTypes } = rootState.application;

    const nodeTemplateDictionary = toNodeTemplateDictionary(
      availablePortTypes,
      nodeTemplates,
    );

    commit("updateCache", nodeTemplateDictionary);

    return {
      found: idsToDictionary(),

      // The `getNodeTemplates` endpoint can ignore ids for uninstalled extensions
      // so, we add that information to the response indicating that these ids are not found.
      // NOTE: Even if not found these ids are still valid templates ids;
      // meaning that the request will fail if a random unrecognized string is provided
      missing: nodeTemplateIds.filter((id) => !state.cache[id]),
    };
  },

  updateCacheFromSearchResults(
    { commit, state },
    { nodeTemplates }: { nodeTemplates: Array<NodeTemplateWithExtendedPorts> },
  ) {
    const nodeTemplateDictionary = arrayToDictionary(
      // only update non-cached templates
      nodeTemplates.filter(({ id }) => !state.cache[id]),
      "id",
    );

    commit("updateCache", nodeTemplateDictionary);
  },

  setDraggingNodeTemplate(
    { commit },
    nodeTemplate: NodeTemplateWithExtendedPorts,
  ) {
    commit("setIsDraggingNodeTemplate", Boolean(nodeTemplate));
    commit("setDraggedTemplateData", nodeTemplate);
  },
};
