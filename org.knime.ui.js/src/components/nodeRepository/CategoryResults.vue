<script lang="ts">
import { mapState, mapMutations, mapActions } from "vuex";

import ScrollViewContainer from "./ScrollViewContainer.vue";
import NodeCategory from "./NodeCategory.vue";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { defineComponent, type PropType } from "vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";
import type { NavReachedEvent } from "./NodeList.vue";

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
  emits: ["showNodeDescription", "navReachedTop"],
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
      set(value: NodeTemplateWithExtendedPorts | null) {
        this.$store.commit("nodeRepository/setSelectedNode", value);
      },
    },
  },
  expose: ["focusFirst"],
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
    onNavReachedEnd(index: number, event: NavReachedEvent) {
      // @ts-ignore
      const category = this.$refs.categories?.[index + 1];
      if (category) {
        category.focusFirst(event);
      }
    },
    onNavReachedTop(index: number, event: NavReachedEvent) {
      if (index === 0) {
        this.$emit("navReachedTop", event);
      } else {
        // @ts-ignore
        const category = this.$refs.categories?.[index - 1];
        if (category) {
          category.focusLast(event);
        }
      }
    },
    onHelpKey(node: NodeTemplateWithExtendedPorts) {
      this.$emit("showNodeDescription", {
        nodeTemplate: node,
        isDescriptionActive: this.showDescriptionForNode?.id === node.id,
      });
    },
    focusFirst() {
      // @ts-ignore
      this.$refs.categories?.[0].focusFirst();
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
      <template
        v-for="({ tag, nodes }, index) in nodesPerCategory"
        :key="`tag-${tag}`"
      >
        <NodeCategory
          ref="categories"
          v-model:selected-node="selectedNode"
          class="category"
          :tag="tag"
          :nodes="nodes"
          :show-description-for-node="showDescriptionForNode"
          :display-mode="displayMode"
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
  padding: 0 15px 15px;
}
</style>
