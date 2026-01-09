<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { Tag } from "@knime/components";

import ScrollViewContainer from "@/components/common/ScrollViewContainer/ScrollViewContainer.vue";
import {
  DraggableNodeTemplate,
  type NavReachedEvent,
  NodeList,
  useAddNodeTemplateWithAutoPositioning,
} from "@/components/nodeTemplates";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import type { NodeTemplateWithExtendedPorts } from "@/util/data-mappers";

const TAG_LIMIT = 8;

type Props = {
  displayMode?: NodeRepositoryDisplayModesType;
};

const props = withDefaults(defineProps<Props>(), { displayMode: "icon" });

const emit = defineEmits(["showNodeDescription", "navReachedTop"]);

const { addNodeWithAutoPositioning } = useAddNodeTemplateWithAutoPositioning();

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

const onShowNodeDetails = (node: NodeTemplateWithExtendedPorts) => {
  emit("showNodeDescription", {
    nodeTemplate: node,
    isDescriptionActive: showDescriptionForNode.value?.id === node.id,
  });
};

const groupedNodeListRefs = useTemplateRef("groupedNodeListRefs");

const focusFirst = (navReached?: NavReachedEvent) => {
  groupedNodeListRefs.value?.at(0)?.focusFirst(navReached);
};

const onNavReachedEnd = (index: number, event: NavReachedEvent) => {
  const nodeList = groupedNodeListRefs.value?.[index + 1];
  if (nodeList) {
    nodeList.focusFirst(event);
  }
};

const onNavReachedTop = (index: number, event: NavReachedEvent) => {
  if (index === 0) {
    emit("navReachedTop", event);
  } else {
    const nodeList = groupedNodeListRefs.value?.[index - 1];
    if (nodeList) {
      nodeList.focusLast(event);
    }
  }
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
        <div
          :data-test-id="tag"
          :class="['grouped-by-tags', `display-${displayModeSupported}`]"
        >
          <div class="tag-header-line">
            <Tag class="tag" clickable @click="onSelectTag(tag)">{{ tag }}</Tag>
            <hr />
          </div>

          <NodeList
            ref="groupedNodeListRefs"
            v-model:selected-node="selectedNode"
            :nodes="nodes"
            class="tag-node-list"
            :has-more-nodes="nodes.length >= TAG_LIMIT"
            :show-details-for="showDescriptionForNode"
            :display-mode="displayMode"
            @show-more="onSelectTag(tag)"
            @enter-key="addNodeWithAutoPositioning($event.nodeFactory!)"
            @show-node-details="onShowNodeDetails"
            @nav-reached-top="onNavReachedTop(index, $event)"
            @nav-reached-end="onNavReachedEnd(index, $event)"
          >
            <template #item="itemProps">
              <DraggableNodeTemplate
                v-bind="itemProps"
                @show-node-description="$emit('showNodeDescription', itemProps)"
              />
            </template>
            <template #more-button>Show all</template>
          </NodeList>
        </div>
      </template>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.content {
  padding: 0 var(--space-8) var(--space-8) var(--sidebar-panel-padding);
}

.grouped-by-tags {
  &.node-template-list-mode {
    & .tag-node-list {
      padding-top: var(--space-4);
    }
  }

  & .tag {
    margin-bottom: 0;
    height: var(--space-24);
  }

  & .tag-header-line {
    display: flex;
    align-items: center;
  }

  & hr {
    flex: 1;
    border: 0;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
