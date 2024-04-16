<script lang="ts">
import { mapState, mapMutations, mapActions } from "vuex";

import ScrollViewContainer from "./ScrollViewContainer.vue";
import NodeCategory from "./NodeCategory.vue";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { defineComponent, type PropType } from "vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";

export default defineComponent({
  components: {
    NodeCategory,
    ScrollViewContainer,
  },
  props: {
    displayMode: {
      type: String as PropType<NodeRepositoryDisplayModesType>,
      default: "icon",
    },
  },
  emits: ["showNodeDescription"],
  setup() {
    const addNodeToWorkflow = useAddNodeToWorkflow();
    return { addNodeToWorkflow };
  },
  computed: {
    ...mapState("nodeRepository", [
      "showDescriptionForNode",
      "categoryScrollPosition",
      "nodesPerCategory",
    ]),
    selectedNode: {
      get() {
        return this.$store.state.nodeRepository.selectedNode;
      },
      set(value: NodeTemplateWithExtendedPorts) {
        this.$store.commit("nodeRepository/setSelectedNode", value);
      },
    },
  },
  methods: {
    ...mapActions("nodeRepository", ["getAllNodes", "setSelectedTags"]),
    ...mapMutations("nodeRepository", ["setCategoryScrollPosition"]),

    onScrollBottom() {
      this.getAllNodes({ append: true });
    },
    onSaveScrollPosition(position: number) {
      this.setCategoryScrollPosition(position);
    },
    onSelectTag(tag: string) {
      this.setSelectedTags([tag]);
    },
  },
});
</script>

<template>
  <ScrollViewContainer
    class="results"
    :initial-position="categoryScrollPosition"
    @scroll-bottom="onScrollBottom"
    @save-position="onSaveScrollPosition"
  >
    <div class="content">
      <template v-for="{ tag, nodes } in nodesPerCategory" :key="`tag-${tag}`">
        <NodeCategory
          v-model:selected-node="selectedNode"
          class="category"
          :tag="tag"
          :nodes="nodes"
          :show-description-for-node="showDescriptionForNode"
          :display-mode="displayMode"
          @item-enter-key="addNodeToWorkflow"
          @select-tag="onSelectTag"
          @show-node-description="$emit('showNodeDescription', $event)"
        />
      </template>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.content {
  padding: 0 15px 15px;
}
</style>
