<script>
import { mapState, mapMutations, mapActions } from "vuex";

import ScrollViewContainer from "./ScrollViewContainer.vue";
import NodeCategory from "./NodeCategory.vue";

export default {
  components: {
    NodeCategory,
    ScrollViewContainer,
  },
  props: {
    displayMode: {
      type: String,
      default: "icon",
    },
  },

  emits: ["showNodeDescription"],

  computed: {
    ...mapState("nodeRepository", [
      "selectedNode",
      "categoryScrollPosition",
      "nodesPerCategory",
    ]),
  },
  methods: {
    ...mapActions("nodeRepository", ["getAllNodes", "setSelectedTags"]),
    ...mapMutations("nodeRepository", ["setCategoryScrollPosition"]),

    onScrollBottom() {
      this.getAllNodes({ append: true });
    },
    onSaveScrollPosition(position) {
      this.setCategoryScrollPosition(position);
    },
    onSelectTag(tag) {
      this.setSelectedTags([tag]);
    },
  },
};
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
          class="category"
          :tag="tag"
          :nodes="nodes"
          :selected-node="selectedNode"
          :display-mode="displayMode"
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
