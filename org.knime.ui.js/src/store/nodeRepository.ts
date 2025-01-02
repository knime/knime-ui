import { reactive, ref } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";

import type {
  NodeCategoryWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/api/custom-types";
import { useNodeSearch } from "@/store/common/useNodeSearch";
import { toNodeTemplateWithExtendedPorts } from "@/util/portDataMapper";

import { useApplicationStore } from "./application/application";
import { useNodeTemplatesStore } from "./nodeTemplates/nodeTemplates";
import { useSettingsStore } from "./settings";

/**
 * Store that manages node repository state.
 */
const tagPageSize = 3;
const firstLoadOffset = 6;

export interface NodeRepositoryState {
  nodesPerTag: Array<{
    tag: string;
    nodes: NodeTemplateWithExtendedPorts[];
  }>;
  totalNumTags: number | null;
  tagPage: number;
  tagScrollPosition: number;

  selectedNode: NodeTemplateWithExtendedPorts | null;
  showDescriptionForNode: NodeTemplateWithExtendedPorts | null;

  /** tree */
  nodeCategoryCache: Map<string, NodeCategoryWithExtendedPorts>;
  treeExpandedKeys: Set<string>;
}

export const useNodeRepositoryStore = defineStore("nodeRepository", () => {
  const nodeSearch = useNodeSearch();

  /* tags */
  const nodesPerTag = ref<
    Array<{
      tag: string;
      nodes: NodeTemplateWithExtendedPorts[];
    }>
  >([]);

  const totalNumTags = ref<number | null>(null);
  const tagPage = ref(0);
  const tagScrollPosition = ref(0);

  /* node interaction */
  const selectedNode = ref<NodeTemplateWithExtendedPorts | null>(null);
  const showDescriptionForNode = ref<NodeTemplateWithExtendedPorts | null>(
    null,
  );

  /** tree */
  const nodeCategoryCache = reactive<
    Map<string, NodeCategoryWithExtendedPorts>
  >(new Map());
  const treeExpandedKeys = reactive<Set<string>>(new Set());

  const setTagPage = (pageNumber: number) => {
    tagPage.value = pageNumber;
  };

  const setNodesPerTags = ({
    groupedNodes,
    append,
  }: {
    groupedNodes: NodeRepositoryState["nodesPerTag"];
    append: boolean;
  }) => {
    nodesPerTag.value = append
      ? nodesPerTag.value.concat(groupedNodes)
      : groupedNodes;
  };

  const setTotalNumTags = (_totalNumTags: number | null) => {
    totalNumTags.value = _totalNumTags;
  };

  const setTagScrollPosition = (value: number) => {
    tagScrollPosition.value = value;
  };

  const setSelectedNode = (node: NodeTemplateWithExtendedPorts | null) => {
    selectedNode.value = node;
  };

  const setShowDescriptionForNode = (
    node: NodeTemplateWithExtendedPorts | null,
  ) => {
    showDescriptionForNode.value = node;
  };

  const updateNodeCategoryCache = ({
    categoryPath,
    nodeCategory,
  }: {
    categoryPath: string[];
    nodeCategory: NodeCategoryWithExtendedPorts;
  }) => {
    nodeCategoryCache.set(categoryPath.join("/"), nodeCategory);
  };

  const resetNodeCategoryCache = () => {
    nodeCategoryCache.clear();
  };

  const addTreeExpandedKey = (key: string) => {
    treeExpandedKeys.add(key);
  };

  const removeTreeExpandedKey = (key: string) => {
    treeExpandedKeys.delete(key);
  };

  const resetTreeExpandedKeys = () => {
    treeExpandedKeys.clear();
  };

  const getNodeCategory = async ({
    categoryPath,
  }: {
    categoryPath: string[];
  }): Promise<NodeCategoryWithExtendedPorts> => {
    const path = categoryPath.join("/");
    if (nodeCategoryCache.has(path)) {
      return nodeCategoryCache.get(path)!;
    }

    const nodeCategoryResult = await API.noderepository.getNodeCategory({
      categoryPath,
    });

    const nodesWithMappedPorts = (nodeCategoryResult.nodes ?? []).map(
      toNodeTemplateWithExtendedPorts(useApplicationStore().availablePortTypes),
    );

    useNodeTemplatesStore().updateCacheFromSearchResults({
      nodeTemplates: nodesWithMappedPorts,
    });

    const result = {
      ...nodeCategoryResult,
      nodes: nodesWithMappedPorts,
    };

    updateNodeCategoryCache({ categoryPath, nodeCategory: result });

    return result;
  };

  const getAllNodes = async ({ append }: { append: boolean }) => {
    if (nodesPerTag.value.length === totalNumTags.value) {
      return;
    }
    const tagsOffset = append
      ? firstLoadOffset + tagPage.value * tagPageSize
      : 0;
    const tagsLimit = append ? tagPageSize : firstLoadOffset;

    if (append) {
      setTagPage(tagPage.value + 1);
    } else {
      nodeSearch.setNodeSearchPage(0);
      setTagPage(0);
    }

    const { totalNumGroups, groups } =
      await API.noderepository.getNodesGroupedByTags({
        numNodesPerTag: 8,
        tagsOffset,
        tagsLimit,
        fullTemplateInfo: true,
      });

    const withMappedPorts = groups.map(({ nodes, tag }) => ({
      nodes: nodes.map(
        toNodeTemplateWithExtendedPorts(
          useApplicationStore().availablePortTypes,
        ),
      ),
      tag,
    }));

    useNodeTemplatesStore().updateCacheFromSearchResults({
      nodeTemplates: withMappedPorts.flatMap(({ nodes }) => nodes),
    });

    setTotalNumTags(totalNumGroups);
    setNodesPerTags({ groupedNodes: withMappedPorts, append });
  };

  const clearTagResults = () => {
    setNodesPerTags({ groupedNodes: [], append: false });
    setTotalNumTags(null);
    setTagPage(0);
    setTagScrollPosition(0);
  };

  const clearTree = () => {
    resetNodeCategoryCache();
    resetTreeExpandedKeys();
  };

  const resetSearchAndTags = async () => {
    if (nodeSearch.searchIsActive.value) {
      nodeSearch.clearSearchResults();
      await nodeSearch.searchNodesDebounced();
    }
    clearTagResults();
    clearTree();
    getAllNodes({ append: false });
  };

  const nodesPerTagContainNodeId = (nodeId: string) => {
    return nodesPerTag.value.some((tag) =>
      tag.nodes.some((node) => node.id === nodeId),
    );
  };

  const treeContainsNodeId = (nodeId: string) => {
    return [...treeExpandedKeys].some(
      (nodeKey) =>
        nodeCategoryCache
          .get(nodeKey)
          ?.nodes?.some((node) => node.id === nodeId),
    );
  };

  const isNodeVisible = (nodeId: string) => {
    if (nodeSearch.searchIsActive.value) {
      return nodeSearch.searchResultsContainNodeId(nodeId);
    }

    if (useSettingsStore().settings.nodeRepositoryDisplayMode === "tree") {
      return treeContainsNodeId(nodeId);
    }

    return nodesPerTagContainNodeId(nodeId);
  };

  return {
    ...nodeSearch,
    nodesPerTag,
    totalNumTags,
    tagPage,
    tagScrollPosition,
    selectedNode,
    showDescriptionForNode,
    nodeCategoryCache,
    treeExpandedKeys,
    setTagPage,
    setNodesPerTags,
    setTotalNumTags,
    setTagScrollPosition,
    setSelectedNode,
    setShowDescriptionForNode,
    updateNodeCategoryCache,
    resetNodeCategoryCache,
    addTreeExpandedKey,
    removeTreeExpandedKey,
    resetTreeExpandedKeys,
    getNodeCategory,
    getAllNodes,
    clearTagResults,
    clearTree,
    resetSearchAndTags,
    nodesPerTagContainNodeId,
    treeContainsNodeId,
    isNodeVisible,
  };
});
