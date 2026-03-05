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

  const fetchResults = async (
    params: { append?: boolean; onDone?: () => void } = {},
  ): Promise<void> => {
    const { append = false } = params;

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
        });

        return apiResponse.map(
          nodeTemplate.toComponentTemplateWithExtendedPorts,
        );
      });

      results.value = append ? results.value.concat(response) : response;

      hasLoaded.value = true;
      currentOffset.value++;

      params.onDone?.();
    } catch (error) {
      if (error instanceof promise.AbortError) {
        return;
      }

      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const debouncedFetchResults = useDebounceFn(fetchResults, SEARCH_DEBOUNCE_MS);

  /**
   * Performs a search using the given query term. This method is debounced.
   *
   * Because of the debouncing behavior, awaiting the returned promise does not
   * reliably indicate when the underlying request has actually been executed.
   * The promise may resolve before the debounced call is triggered.
   *
   * If you need to run logic *only* after the debounced request has been executed and
   * completed, provide the optional `onDone` callback. This callback is invoked
   * once the debounced request has finished.
   */
  const searchByQueryDebounced = async (
    value: string,
    opts: { onDone?: () => void } = {},
  ) => {
    query.value = value;
    currentOffset.value = 0;
    results.value = [];
    hasLoaded.value = false;
    isLoading.value = true;

    await debouncedFetchResults({ onDone: opts.onDone });
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
    searchComponents: (opts: { append?: boolean } = {}) => fetchResults(opts),
    searchByQueryDebounced,
    clearSearch,
  };
};
