import { computed, ref } from "vue";
import { API } from "@api";
import { debounce } from "lodash-es";

import type { NodeRelation } from "@/api/custom-types";
import { createAbortablePromise } from "@/api/utils";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { nodeTemplate } from "@/lib/data-mappers";
import { useApplicationStore } from "@/store/application/application";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";

/**
 * This composable is meant to be shared and used by other stores
 */

const nodeSearchPageSize = 100;
const searchNodesDebounceWait = 150; // ms

export interface CommonNodeSearchState {
  query: string;
  selectedTags: string[];
  portTypeId: string | null;
  nodeRelation: NodeRelation | null;
  searchScrollPosition: number;

  nodes: NodeTemplateWithExtendedPorts[] | null;
  totalNumNodesFound: number;
  totalNumFilteredNodesFound: number;
  nodeSearchPage: number;
  nodesTags: string[];

  abortController: AbortController;
  isLoadingSearchResults: boolean;
}

export const useNodeSearch = () => {
  const query = ref<string>("");
  const selectedTags = ref<string[]>([]);
  const portTypeId = ref<string | null>(null);
  const nodeRelation = ref<NodeRelation | null>(null);
  const searchScrollPosition = ref<number>(0);

  const nodes = ref<NodeTemplateWithExtendedPorts[] | null>(null);
  const totalNumNodesFound = ref<number>(0);
  const totalNumFilteredNodesFound = ref<number>(0);
  const nodeSearchPage = ref<number>(0);
  const nodesTags = ref<string[]>([]);

  const abortController = ref<AbortController>(new AbortController());
  const isLoadingSearchResults = ref<boolean>(false);

  const setQuery = (_query: string) => {
    query.value = _query;
    searchScrollPosition.value = 0;
  };

  const setSelectedTags = (_selectedTags: string[]) => {
    selectedTags.value = _selectedTags;
    searchScrollPosition.value = 0;
  };

  const setPortTypeId = (_portTypeId: string | null) => {
    portTypeId.value = _portTypeId;
  };

  const setSearchNodeRelation = (_nodeRelation: NodeRelation | null) => {
    nodeRelation.value = _nodeRelation;
  };

  const setSearchScrollPosition = (_searchScrollPosition: number) => {
    searchScrollPosition.value = _searchScrollPosition;
  };

  const setNodes = (newNodes: NodeTemplateWithExtendedPorts[] | null) => {
    nodes.value = newNodes;
  };

  const addNodes = (newNodes: NodeTemplateWithExtendedPorts[]) => {
    const existingNodeIds = (nodes.value ?? []).map((node) => node.id);
    const uniqueNewNodes = newNodes.filter(
      (node) => !existingNodeIds.includes(node.id),
    );
    nodes.value = nodes.value
      ? nodes.value.concat(uniqueNewNodes)
      : uniqueNewNodes;
  };

  const setTotalNumNodesFound = (_totalNumNodesFound: number) => {
    totalNumNodesFound.value = _totalNumNodesFound;
  };

  const setTotalNumFilteredNodesFound = (
    _totalNumFilteredNodesFound: number,
  ) => {
    totalNumFilteredNodesFound.value = _totalNumFilteredNodesFound;
  };

  const setNodeSearchPage = (pageNumber: number) => {
    nodeSearchPage.value = pageNumber;
  };

  const setNodesTags = (newNodesTags: string[]) => {
    nodesTags.value = newNodesTags;
  };

  const setAbortController = (controller: AbortController) => {
    abortController.value = controller;
  };

  const setLoadingSearchResults = (isLoading: boolean) => {
    isLoadingSearchResults.value = isLoading;
  };

  const clearSearchResults = () => {
    setNodes(null);
    setNodesTags([]);
    setTotalNumNodesFound(0);
    setTotalNumFilteredNodesFound(0);
  };

  const clearSearchParams = () => {
    setSelectedTags([]);
    setQuery("");
    setPortTypeId(null);
    setSearchNodeRelation(null);
    clearSearchResults();
  };

  const hasSearchParams = computed(
    () => query.value !== "" || selectedTags.value.length > 0,
  );

  const searchIsActive = computed(() =>
    Boolean(query.value || nodesTags.value.length),
  );

  const searchResultsContainNodeId = (selectedNodeId: string) => {
    return Boolean(nodes.value?.some((node) => node.id === selectedNodeId));
  };

  const getFirstSearchResult = computed(
    () => (nodes.value ?? []).at(0) || null,
  );

  const tagsOfVisibleNodes = computed(() => {
    const allTags = [...nodesTags.value, ...selectedTags.value];
    return Array.from(new Set(allTags));
  });

  const searchNodes = async ({ append = false } = {}) => {
    if (!hasSearchParams.value) {
      clearSearchResults();
      return;
    }

    const { abortController: newAbortController, runAbortablePromise } =
      createAbortablePromise();

    abortController.value.abort();
    setAbortController(newAbortController);

    const nextSearchPage = nodeSearchPage.value + 1;
    const searchPage = append ? nextSearchPage : 0;

    try {
      const searchResponse = await runAbortablePromise(() =>
        API.noderepository.searchNodes({
          q: query.value,
          tags: selectedTags.value,
          allTagsMatch: true,
          offset: searchPage * nodeSearchPageSize,
          limit: nodeSearchPageSize,
          fullTemplateInfo: true,
          portTypeId: portTypeId.value!,
          nodeRelation: nodeRelation.value!,
        }),
      );

      setNodeSearchPage(searchPage);

      const {
        nodes: fetchedNodes,
        totalNumNodesFound: fetchedTotalNumNodesFound,
        tags: fetchedTags,
        totalNumFilteredNodesFound: fetchedTotalNumFilteredNodesFound = 0,
      } = searchResponse;

      const withMappedPorts = fetchedNodes.map(
        nodeTemplate.toNodeTemplateWithExtendedPorts(
          useApplicationStore().availablePortTypes,
        ),
      );

      useNodeTemplatesStore().updateCacheFromSearchResults({
        nodeTemplates: withMappedPorts,
      });

      setTotalNumNodesFound(fetchedTotalNumNodesFound);
      setTotalNumFilteredNodesFound(fetchedTotalNumFilteredNodesFound);

      const action = append ? addNodes : setNodes;
      action(withMappedPorts);

      setNodesTags(fetchedTags);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return;
      }

      consola.error("Error in searchNodes", error);
      throw error;
    }
  };

  const searchNodesDebounced = debounce(async () => {
    await searchNodes();
    setLoadingSearchResults(false);
  }, searchNodesDebounceWait);

  const searchNodesNextPage = async () => {
    if (nodes.value?.length !== totalNumNodesFound.value) {
      await searchNodes({ append: true });
    }
  };

  const updateSelectedTags = async (tags: string[]) => {
    setLoadingSearchResults(true);
    setSelectedTags(tags);
    await searchNodesDebounced();
  };

  const updateQuery = async (value: string) => {
    setLoadingSearchResults(true);
    setQuery(value);
    await searchNodesDebounced();
  };

  return {
    query,
    selectedTags,
    portTypeId,
    nodeRelation,
    searchScrollPosition,
    nodes,
    totalNumNodesFound,
    totalNumFilteredNodesFound,
    nodeSearchPage,
    nodesTags,
    abortController,
    isLoadingSearchResults,
    searchNodesDebounced,
    hasSearchParams,
    searchIsActive,
    getFirstSearchResult,
    tagsOfVisibleNodes,
    searchResultsContainNodeId,
    setQuery,
    setSelectedTags,
    setPortTypeId,
    setSearchNodeRelation,
    setSearchScrollPosition,
    setNodes,
    addNodes,
    setTotalNumNodesFound,
    setTotalNumFilteredNodesFound,
    setNodeSearchPage,
    setNodesTags,
    setAbortController,
    setLoadingSearchResults,
    clearSearchResults,
    clearSearchParams,
    searchNodes,
    searchNodesNextPage,
    updateSelectedTags,
    updateQuery,
  };
};
