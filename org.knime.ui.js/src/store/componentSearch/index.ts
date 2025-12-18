import { readonly, ref } from "vue";
import { API } from "@api";
import { debounce } from "lodash-es";
import { defineStore } from "pinia";

import { promise } from "@knime/utils";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { createComponentSearchItem } from "@/test/factories/componentSearch";
import { componentSearch } from "@/util/dataMappers";

export const createData = (total: number, startOffset = 0) =>
  new Array(total).fill(0).map((_, i) =>
    createComponentSearchItem({
      name: `Component ${startOffset + i}`,
      id: `id-${i}`,
    }),
  );

const PAGE_SIZE = 50;

export const useComponentSearchStore = defineStore("componentSearch", () => {
  const isLoading = ref(false);
  const hasLoaded = ref(false);
  const query = ref("");
  const currentOffset = ref(0);
  const searchScrollPosition = ref(0);

  const results = ref<NodeTemplateWithExtendedPorts[]>([]);

  let abortController: AbortController;

  const searchComponents = async (
    params: { append?: boolean } = {},
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
      consola.info("componentSearch:: Fetching components", {
        query: query.value,
        offset: currentOffset.value,
        limit: PAGE_SIZE,
      });

      const response = await runAbortablePromise(async () => {
        if (query.value === "foo") {
          return [];
        }

        const responseFromAPI = await API.space.searchComponents({
          query: query.value,
          offset: currentOffset.value * PAGE_SIZE,
          limit: PAGE_SIZE,
        });

        // const response = createData(
        //   PAGE_SIZE,
        //   PAGE_SIZE * currentOffset.value,
        // ).map(componentSearch.toNodeTemplateWithExtendedPorts);
        //
        // // return response;

        let mapped = responseFromAPI.map(
          componentSearch.toNodeTemplateWithExtendedPorts,
        );
        return mapped;
      });

      results.value = append ? results.value.concat(response) : response;

      isLoading.value = false;
      hasLoaded.value = true;
      currentOffset.value++;
    } catch (error) {
      if (error instanceof promise.AbortError) {
        return;
      }

      throw error;
    }
  };

  const debouncedSearch = debounce(() => searchComponents(), 300);

  const updateQuery = (value: string) => {
    query.value = value;
    currentOffset.value = 0;
    results.value = [];
    hasLoaded.value = false;
    isLoading.value = true;
    debouncedSearch();
  };

  return {
    searchScrollPosition,
    query: readonly(query),
    isLoading: readonly(isLoading),
    hasLoaded: readonly(hasLoaded),
    results,
    searchComponents,
    updateQuery,
  };
});
