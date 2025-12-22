<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { SearchInput } from "@knime/components";

import NodeTemplate from "@/components/common/NodeTemplate/NodeTemplate.vue";
import NodeRepositoryLoader from "@/components/nodeRepository/NodeRepositoryLoader.vue";
import type { QuickActionMenuContext } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/types";
import { useApplicationStore } from "@/store/application/application";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useComponentSearchStore } from "@/store/componentSearch";
import ComponentSearchResults from "../ComponentSearchResults.vue";

type Props = {
  quickActionContext: QuickActionMenuContext;
};

const props = defineProps<Props>();

const { nodeRepositoryLoaded, nodeRepositoryLoadingProgress } = storeToRefs(
  useApplicationStore(),
);
const { subscribeToNodeRepositoryLoadingEvent } = useLifecycleStore();
const componentSearchStore = useComponentSearchStore();

const searchEnterKey = () => {
  // TODO: add first component
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
      :model-value="componentSearchStore.query"
      placeholder="Search components in the KNIME Hub"
      class="search-bar"
      focus-on-mount
      tabindex="0"
      @update:model-value="componentSearchStore.updateQuery($event)"
      @keydown.enter.prevent.stop="searchEnterKey"
      @keydown.down.prevent.stop="searchDownKey"
    />
  </div>
  <hr />

  <template v-if="nodeRepositoryLoaded">
    <ComponentSearchResults ref="componentSearchResults" :active="true">
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

& hr {
  border: none;
  border-top: 1px solid var(--knime-silver-sand);
  margin: 0;
}

& .header {
  padding: 10px;
  flex: none;
}

& :deep(.filtered-nodes-wrapper) {
  border-top: none;
}
</style>
