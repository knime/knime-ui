<script lang="ts">
import { mapState, mapMutations, mapActions } from "vuex";

import ScrollViewContainer from "./ScrollViewContainer.vue";
import NodesGroupedByTags from "./NodesGroupedByTags.vue";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { defineComponent, type PropType } from "vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";
import type { NavReachedEvent } from "./NodeList.vue";

type NodesGroupedByTagsComponentRef = Array<
  InstanceType<typeof NodesGroupedByTags>
>;

export default defineComponent({
  components: {
    NodesGroupedByTags,
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
      "tagScrollPosition",
      "nodesPerTag",
    ]),
    selectedNode: {
      get() {
        return this.$store.state.nodeRepository.selectedNode;
      },
      set(value: NodeTemplateWithExtendedPorts | null) {
        this.$store.commit("nodeRepository/setSelectedNode", value);
      },
    },
    displayModeSupported() {
      if (this.displayMode === "tree") {
        return "list";
      }
      return this.displayMode;
    },
  },
  expose: ["focusFirst"],
  methods: {
    ...mapActions("nodeRepository", ["getAllNodes", "setSelectedTags"]),
    ...mapMutations("nodeRepository", ["setTagScrollPosition"]),

    onScrollBottom() {
      this.getAllNodes({ append: true });
    },
    onSaveScrollPosition(position: number) {
      this.setTagScrollPosition(position);
    },
    onSelectTag(tag: string) {
      this.setSelectedTags([tag]);
    },
    onNavReachedEnd(index: number, event: NavReachedEvent) {
      const tags = this.$refs.tags as NodesGroupedByTagsComponentRef;
      const tag = tags?.[index + 1];
      if (tag) {
        tag.focusFirst(event);
      }
    },
    onNavReachedTop(index: number, event: NavReachedEvent) {
      if (index === 0) {
        this.$emit("navReachedTop", event);
      } else {
        const tags = this.$refs.tags as NodesGroupedByTagsComponentRef;
        const tag = tags?.[index - 1];
        if (tag) {
          tag.focusLast(event);
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
      const tags = this.$refs.tags as NodesGroupedByTagsComponentRef;
      tags?.[0].focusFirst();
    },
  },
});
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
  padding: 0 15px 15px;
}
</style>
