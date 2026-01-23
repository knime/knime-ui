<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { SearchInput } from "@knime/components";

import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import { NodeTemplate } from "@/components/nodeTemplates";
import type { QuickActionMenuContext } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/types";
import { useApplicationStore } from "@/store/application/application";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useQuickActionComponentSearchStore } from "@/store/componentSearch";
import { getToastPresets } from "@/toastPresets";
import ComponentSearchResults from "../ComponentSearchResults.vue";

type Props = {
  quickActionContext: QuickActionMenuContext;
};

const props = defineProps<Props>();

const { toastPresets } = getToastPresets();

const { nodeRepositoryLoaded, nodeRepositoryLoadingProgress } = storeToRefs(
  useApplicationStore(),
);
const { subscribeToNodeRepositoryLoadingEvent } = useLifecycleStore();
const componentSearchStore = useQuickActionComponentSearchStore();
const { isLoading, hasLoaded, results, query } =
  storeToRefs(componentSearchStore);

const updateSearchQuery = async (value: string) => {
  try {
    await componentSearchStore.updateQuery(value);
  } catch (error) {
    toastPresets.search.nodeSearch({ error });
  }
};

const searchEnterKey = () => {
  // TODO: NXT-4328 add first component
};

const componentSearchResults = useTemplateRef("componentSearchResults");
const searchDownKey = () => {
  componentSearchResults.value?.focusFirst();
};

onMounted(() => {
  props.quickActionContext.updateMenuStyle({ height: "445px" });

  subscribeToNodeRepositoryLoadingEvent();
});
</script>

<template>
  <div class="header">
    <SearchInput
      ref="search"
      :disabled="!nodeRepositoryLoaded"
      :model-value="query"
      placeholder="Search components in the KNIME Hub"
      class="search-bar"
      focus-on-mount
      tabindex="0"
      @update:model-value="updateSearchQuery"
      @keydown.enter.prevent.stop="searchEnterKey"
      @keydown.down.prevent.stop="searchDownKey"
    />
  </div>

  <template v-if="nodeRepositoryLoaded">
    <ComponentSearchResults
      ref="componentSearchResults"
      :active="true"
      :is-loading="isLoading"
      :has-loaded="hasLoaded"
      :results="results"
      :fetch-data="componentSearchStore.searchComponents"
      @nav-reached-top="($refs.search as any).focus()"
    >
      <template #nodesTemplate="itemProps">
        <NodeTemplate v-bind="itemProps" />
      </template>
    </ComponentSearchResults>
  </template>

  <template v-else>
    <NodeRepositoryLoader
      :progress="nodeRepositoryLoadingProgress?.progress"
      :extension-name="nodeRepositoryLoadingProgress?.extensionName"
    />
  </template>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

&:focus {
  outline: none;
}

& .header {
  padding: 10px;
  flex: none;
  border-bottom: 1px solid var(--knime-silver-sand);
}

& :deep(.filtered-nodes-wrapper) {
  border-top: none;
}
</style>
