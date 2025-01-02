<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

import type { NavReachedEvent } from "./NodeList.vue";
import NodesGroupedByTags from "./NodesGroupedByTags.vue";
import ScrollViewContainer from "./ScrollViewContainer.vue";
import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";

type Props = {
  displayMode?: NodeRepositoryDisplayModesType;
};

const props = withDefaults(defineProps<Props>(), { displayMode: "icon" });

const emit = defineEmits(["showNodeDescription", "navReachedTop"]);

const addNodeToWorkflow = useAddNodeToWorkflow();

const nodeRepositoryStore = useNodeRepositoryStore();
const { showDescriptionForNode, tagScrollPosition, nodesPerTag, selectedNode } =
  storeToRefs(nodeRepositoryStore);

const displayModeSupported = computed(() => {
  if (props.displayMode === "tree") {
    return "list";
  }
  return props.displayMode;
});

const getAllNodes = async (append: boolean) => {
  await nodeRepositoryStore.getAllNodes({ append });
};

const setTagScrollPosition = (position: number) => {
  nodeRepositoryStore.setTagScrollPosition(position);
};

const onScrollBottom = () => {
  getAllNodes(true);
};

const onSaveScrollPosition = (position: number) => {
  setTagScrollPosition(position);
};

const onSelectTag = (tag: string) => {
  nodeRepositoryStore.updateSelectedTags([tag]);
};

const tags = ref<InstanceType<typeof NodesGroupedByTags>[]>([]);

const onNavReachedEnd = (index: number, event: NavReachedEvent) => {
  const tag = tags.value?.[index + 1];
  if (tag) {
    tag.focusFirst(event);
  }
};

const onNavReachedTop = (index: number, event: NavReachedEvent) => {
  if (index === 0) {
    emit("navReachedTop", event);
  } else {
    const tag = tags.value?.[index - 1];
    if (tag) {
      tag.focusLast(event);
    }
  }
};

const onHelpKey = (node: NodeTemplateWithExtendedPorts) => {
  emit("showNodeDescription", {
    nodeTemplate: node,
    isDescriptionActive: showDescriptionForNode.value?.id === node.id,
  });
};

const focusFirst = () => {
  tags.value?.[0].focusFirst();
};

defineExpose({ focusFirst });
</script>

<template>
  <ScrollViewContainer
    class="results"
    :initial-position="tagScrollPosition"
    @scroll-bottom="onScrollBottom"
    @save-position="onSaveScrollPosition"
  >
    <div class="content">
      <template
        v-for="({ tag, nodes }, index) in nodesPerTag"
        :key="`tag-${tag}`"
      >
        <NodesGroupedByTags
          ref="tags"
          v-model:selected-node="selectedNode"
          class="tag"
          :tag="tag"
          :nodes="nodes"
          :show-description-for-node="showDescriptionForNode"
          :display-mode="displayModeSupported"
          @item-enter-key="addNodeToWorkflow"
          @select-tag="onSelectTag"
          @help-key="onHelpKey"
          @nav-reached-end="onNavReachedEnd(index, $event)"
          @nav-reached-top="onNavReachedTop(index, $event)"
          @show-node-description="$emit('showNodeDescription', $event)"
        />
      </template>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.content {
  padding: 0 var(--space-8) var(--space-8) var(--sidebar-panel-padding);
}
</style>
