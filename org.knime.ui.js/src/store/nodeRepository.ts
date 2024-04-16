import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import type {
  ComponentMetadata,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";

import {
  toNativeNodeDescriptionWithExtendedPorts,
  toNodeTemplateWithExtendedPorts,
  toComponentNodeDescriptionWithExtendedPorts,
} from "@/util/portDataMapper";

import * as nodeSearch from "./common/nodeSearch";
import type { RootStoreState } from "./types";

/**
 * Store that manages node repository state.
 */

const categoryPageSize = 3;
const firstLoadOffset = 6;

export interface NodeRepositoryState extends nodeSearch.CommonNodeSearchState {
  nodesPerCategory: Array<{
    tag: string;
    nodes: NodeTemplateWithExtendedPorts[];
  }>;
  totalNumCategories: number | null;
  categoryPage: number;
  categoryScrollPosition: number;

  selectedNode: NodeTemplateWithExtendedPorts | null;
  showDescriptionForNode: NodeTemplateWithExtendedPorts | null;
  isDraggingNode: boolean;
  draggedNodeData: NodeTemplateWithExtendedPorts | null;

  nodeTemplates: Record<string, NodeTemplate>;
}

export const state = (): NodeRepositoryState => ({
  ...nodeSearch.state(),

  /* categories */
  nodesPerCategory: [],
  totalNumCategories: null,
  categoryPage: 0,
  categoryScrollPosition: 0,

  /* node interaction */
  selectedNode: null,
  showDescriptionForNode: null,
  isDraggingNode: false,
  draggedNodeData: null,

  /* node templates */
  nodeTemplates: {},
});

export const mutations: MutationTree<NodeRepositoryState> = {
  ...nodeSearch.mutations,

  setCategoryPage(state, pageNumber) {
    state.categoryPage = pageNumber;
  },

  setNodesPerCategories(state, { groupedNodes, append }) {
    state.nodesPerCategory = append
      ? state.nodesPerCategory.concat(groupedNodes)
      : groupedNodes;
  },

  setTotalNumCategories(state, totalNumCategories) {
    state.totalNumCategories = totalNumCategories;
  },

  setCategoryScrollPosition(state, value) {
    state.categoryScrollPosition = value;
  },

  setSelectedNode(state, node) {
    state.selectedNode = node;
  },

  setShowDescriptionForNode(state, node) {
    state.showDescriptionForNode = node;
  },

  setDraggingNode(state, value) {
    state.isDraggingNode = value;
  },

  setDraggedNodeData(state, value) {
    state.draggedNodeData = value;
  },
};

export const actions: ActionTree<NodeRepositoryState, RootStoreState> = {
  ...nodeSearch.actions,

  async getAllNodes({ commit, state, rootState }, { append }) {
    if (state.nodesPerCategory.length === state.totalNumCategories) {
      return;
    }
    const tagsOffset = append
      ? firstLoadOffset + state.categoryPage * categoryPageSize
      : 0;
    const tagsLimit = append ? categoryPageSize : firstLoadOffset;

    if (append) {
      commit("setCategoryPage", state.categoryPage + 1);
    } else {
      commit("setNodeSearchPage", 0);
      commit("setCategoryPage", 0);
    }

    const { totalNumGroups, groups } =
      await API.noderepository.getNodesGroupedByTags({
        numNodesPerTag: 8,
        tagsOffset,
        tagsLimit,
        fullTemplateInfo: true,
      });

    const { availablePortTypes } = rootState.application;
    const withMappedPorts = groups.map(({ nodes, tag }) => ({
      nodes: nodes.map(toNodeTemplateWithExtendedPorts(availablePortTypes)),
      tag,
    }));

    commit("setTotalNumCategories", totalNumGroups);
    commit("setNodesPerCategories", { groupedNodes: withMappedPorts, append });
  },

  async getNodeDescription({ rootState }, { selectedNode }) {
    const { className, settings } = selectedNode.nodeFactory;
    const node = await API.node.getNodeDescription({
      nodeFactoryKey: { className, settings },
    });

    const { availablePortTypes } = rootState.application;
    return toNativeNodeDescriptionWithExtendedPorts(availablePortTypes)(node);
  },

  async getComponentDescription({ rootState, rootGetters }, { nodeId }) {
    const { projectId, workflowId } =
      rootGetters["workflow/projectAndWorkflowIds"];

    const node = (await API.node.getComponentDescription({
      nodeId,
      projectId,
      workflowId,
    })) as ComponentMetadata; // TODO: NXT-2023 - remove type cast

    const { availablePortTypes } = rootState.application;
    return toComponentNodeDescriptionWithExtendedPorts(availablePortTypes)(
      node,
    );
  },

  clearCategoryResults({ commit }) {
    commit("setNodesPerCategories", { groupedNodes: [], append: false });
    commit("setTotalNumCategories", null);
    commit("setCategoryPage", 0);
    commit("setCategoryScrollPosition", 0);
  },

  async resetSearchAndCategories({ dispatch, getters }) {
    if (getters.searchIsActive) {
      await dispatch("clearSearchResults");
      await dispatch("searchStarterOrAllNodes");
    }
    // Always clear the category results
    await dispatch("clearCategoryResults");
    await dispatch("getAllNodes", { append: false });
  },

  async getNodeTemplate({ state }, nodeTemplateId) {
    if (state.nodeTemplates?.nodeTemplateId) {
      return state.nodeTemplates?.nodeTemplateId;
    } else {
      const nodeTemplates = await API.noderepository.getNodeTemplates({
        nodeTemplateIds: [nodeTemplateId],
      });

      // cache results
      state.nodeTemplates[nodeTemplateId] = nodeTemplates[nodeTemplateId];
      return nodeTemplates[nodeTemplateId];
    }
  },

  setDraggingNodeTemplate({ commit }, nodeTemplate) {
    commit("setDraggingNode", Boolean(nodeTemplate));
    commit("setDraggedNodeData", nodeTemplate);
  },
};

export const getters: GetterTree<NodeRepositoryState, RootStoreState> = {
  ...nodeSearch.getters,

  nodesPerCategoryContainNode(state) {
    return (nodeId: string) =>
      state.nodesPerCategory.some((category) =>
        category.nodes.some((node) => node.id === nodeId),
      );
  },

  isNodeVisible: (state, getters) => (nodeId: string) =>
    getters.searchIsActive
      ? getters.searchResultsContainNodeId(nodeId)
      : getters.nodesPerCategoryContainNode(nodeId),
};
