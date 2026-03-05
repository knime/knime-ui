import { readonly, ref } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { API } from "@api";

import { promise } from "@knime/utils";

import type { ComponentNodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { nodeTemplate } from "@/lib/data-mappers";

const PAGE_SIZE = 150;
const SEARCH_DEBOUNCE_MS = 300;

export const useComponentSearch = () => {
  const isLoading = ref(false);
  const hasLoaded = ref(false);
  const query = ref("");
  const currentOffset = ref(0);

  const results = ref<ComponentNodeTemplateWithExtendedPorts[]>([]);
  let abortController: AbortController;

  const searchComponents = async (
    params: {
      append?: boolean;
      portSide?: "input" | "output";
      portId?: string | null;
    } = {},
  ): Promise<void> => {
    const { append = false, portSide, portId } = params;

    isLoading.value = true;

    const { abortController: newAbortController, runAbortablePromise } =
      promise.createAbortablePromise();

    if (abortController) {
      abortController.abort();
    }

    abortController = newAbortController;

    try {
      consola.info("componentSearch:: Fetching results", {
        query: query.value,
        offset: currentOffset.value,
        limit: PAGE_SIZE,
      });

      const response = await runAbortablePromise(async () => {
        const apiResponse = await API.space.searchComponents({
          query: query.value,
          offset: currentOffset.value * PAGE_SIZE,
          limit: PAGE_SIZE,
          ...(portSide ? { portSide } : {}),
          ...(portId ? { portId } : {}),
        });

        return apiResponse.map(
          nodeTemplate.toComponentTemplateWithExtendedPorts,
        );
      });

      results.value = append ? results.value.concat(response) : response;

      hasLoaded.value = true;
      currentOffset.value++;
    } catch (error) {
      if (error instanceof promise.AbortError) {
        return;
      }

      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const debouncedSearch = useDebounceFn(searchComponents, SEARCH_DEBOUNCE_MS);

  const updateQuery = async (
    value: string,
    params: { portSide?: "input" | "output"; portId?: string | null } = {},
  ) => {
    query.value = value;
    currentOffset.value = 0;
    results.value = [];
    hasLoaded.value = false;
    isLoading.value = true;
    await debouncedSearch(params);
  };

  const clearSearch = () => {
    query.value = "";
    currentOffset.value = 0;
    results.value = [];
    hasLoaded.value = false;
    isLoading.value = false;
  };

  return {
    query: readonly(query),
    isLoading: readonly(isLoading),
    hasLoaded: readonly(hasLoaded),
    results,
    searchComponents,
    updateQuery,
    clearSearch,
  };
};
