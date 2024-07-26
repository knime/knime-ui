<script lang="ts" setup>
import VirtualTree, {
  type BaseTreeNode,
  type TreeNodeOptions,
  type TreeContext,
  type NodeKey,
} from "@ysx-libs/vue-virtual-tree";

// import "@ysx-libs/vue-virtual-tree/style.css";

import ReloadIcon from "@knime/styles/img/icons/reload.svg";
import ArrowNextIcon from "@knime/styles/img/icons/arrow-next.svg";

import { computed, onMounted, ref } from "vue";
import { useStore } from "@/composables/useStore";
import ScrollViewContainer from "./ScrollViewContainer.vue";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import DraggableNodeTemplate from "./DraggableNodeTemplate.vue";
import type { NavigationKey } from "./NodeList.vue";

const emit = defineEmits<{
  showNodeDescription: [
    {
      isDescriptionActive: boolean;
      nodeTemplate: NodeTemplateWithExtendedPorts;
    },
  ];
  navReachedTop: [{ key: NavigationKey }];
}>();

const store = useStore();

const rootCategories = ref<TreeNodeOptions[]>();

const mapCategory = (category: { id: string; name: string }) => ({
  nodeKey: category.id,
  name: category.name,
  hasChildren: true,
});

onMounted(async () => {
  rootCategories.value = (
    await store.dispatch("nodeRepository/getRootCategories")
  ).map(mapCategory);
});

const tree = ref<TreeContext>();

const focusFirst = () => {
  consola.warn("CategoryTree::focus Tree focus not yet implemented");
};

const loadedNodeIds = ref<Map<NodeKey, string[]>>(new Map<NodeKey, string[]>());

const getExpandedNodeIds = () => {
  const expandedKeys = tree.value!.getExpandedKeys();
  return expandedKeys
    .map((key: NodeKey) => loadedNodeIds.value.get(key) ?? [])
    .flat();
};

const loadData = async (
  treeNode: BaseTreeNode,
  callback: (children: TreeNodeOptions[]) => void,
) => {
  const { categories, nodes } = await store.dispatch(
    "nodeRepository/getNodesOfCategory",
    {
      categoryId: treeNode.name, // TODO: change
    },
  );

  const mappedNodes = nodes.map((node: NodeTemplateWithExtendedPorts) => {
    return {
      nodeKey: `${node.id}__${Date.now()}`, // make it unique TODO: remove me
      name: node.name,
      nodeTemplate: node,
      hasChildren: false,
    };
  });

  // remember nodeIds for visible check
  const nodeIds = nodes.map((node: NodeTemplateWithExtendedPorts) => node.id);
  loadedNodeIds.value.set(treeNode.key, nodeIds);

  // simulate more loading time
  // await new Promise((r) => setTimeout(r, 250));

  callback([...categories.map(mapCategory), ...mappedNodes]);
};

const showDescriptionForNode = computed(
  () => store.state.nodeRepository.showDescriptionForNode,
);

const onShowNodeDescription = (treeNode: BaseTreeNode) => {
  const { nodeTemplate } = treeNode.origin;

  emit("showNodeDescription", {
    nodeTemplate,
    isDescriptionActive: showDescriptionForNode.value?.id === nodeTemplate.id,
  });
};

const isTreeNodeSelected = (treeNode: BaseTreeNode) => {
  return tree.value!.getSelectedNode()?.key === treeNode.key;
};

defineExpose({ focusFirst, getExpandedNodeIds });
</script>

<template>
  <ScrollViewContainer class="results" :initial-position="0">
    <div class="scroll-container-content">
      <VirtualTree
        ref="tree"
        :source="rootCategories"
        :load-data="loadData"
        indent-type="margin"
      >
        <template #node="{ node }: { node: BaseTreeNode }">
          <DraggableNodeTemplate
            v-if="node.origin.nodeTemplate"
            :node-template="node.origin.nodeTemplate"
            :is-highlighted="false"
            :is-selected="isTreeNodeSelected(node)"
            :is-description-active="
              showDescriptionForNode?.id === node.origin.nodeTemplate.id
            "
            display-mode="tree"
            @show-node-description="onShowNodeDescription(node)"
          />
          <span
            v-else
            :class="['category', { selected: isTreeNodeSelected(node) }]"
            @click="tree!.toggleExpand(node.key)"
            >{{ node.name }}</span
          >
        </template>
        <template #icon="{ loading }">
          <ReloadIcon v-if="loading" class="icon" />
          <ArrowNextIcon v-else class="icon" />
        </template>
      </VirtualTree>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.scroll-container-content {
  padding: 0 20px 15px;
  font-family: "Roboto Condensed", sans-serif;
}

.category {
  display: block;
  width: 100%;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;

  &.selected {
    color: var(--knime-white);
  }
}

:deep(.vir-tree-node:has(.category.selected)) {
  background-color: var(--knime-masala);

  & .icon {
    stroke: var(--knime-white);
  }
}
</style>

<style lang="css">
/** inlined virtual tree styles */
/* stylelint-disable */
.vue-recycle-scroller {
  position: relative;
}
.vue-recycle-scroller.direction-vertical:not(.page-mode) {
  overflow-y: auto;
}
.vue-recycle-scroller.direction-horizontal:not(.page-mode) {
  overflow-x: auto;
}
.vue-recycle-scroller.direction-horizontal {
  display: flex;
}
.vue-recycle-scroller__slot {
  flex: auto 0 0;
}
.vue-recycle-scroller__item-wrapper {
  flex: 1;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}
.vue-recycle-scroller.ready .vue-recycle-scroller__item-view {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}
.vue-recycle-scroller.direction-vertical .vue-recycle-scroller__item-wrapper {
  width: 100%;
}
.vue-recycle-scroller.direction-horizontal .vue-recycle-scroller__item-wrapper {
  height: 100%;
}
.vue-recycle-scroller.ready.direction-vertical
  .vue-recycle-scroller__item-view {
  width: 100%;
}
.vue-recycle-scroller.ready.direction-horizontal
  .vue-recycle-scroller__item-view {
  height: 100%;
}
.resize-observer[data-v-b329ee4c] {
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  pointer-events: none;
  display: block;
  overflow: hidden;
  opacity: 0;
}
.resize-observer[data-v-b329ee4c] object {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
}
.vir-tree {
  --white-color: var(--knime-white);
  --border-color: var(--knime-dove-gray);
  --dash-border-color: var(--knime-silver-sand-semi);
  --primary-color: var(--knime-cornflower);
  --assist-color: var(--knime-aquamarine);
  --disable-color: var(--knime-stone-dark);
  --text-color: var(--knime-masala);
  --gray-color-tree: var(--knime-silver-sand-semi);
  --font-size-base: 13px;
  --font-size-mid: var(--font-size-base) + 2;
  --font-size-large: var(--font-size-base) + 4;
  --font-size-huge: var(--font-size-base) + 10;
}

.vir-checkbox {
  display: inline-block;
  cursor: pointer;
  user-select: none;
}
.vir-checkbox .inner {
  display: inline-block;
  vertical-align: text-bottom;
  position: relative;
  width: 16px;
  height: 16px;
  direction: ltr;
  background-color: var(--white-color);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  border-collapse: initial;
  /*transition: all 0.2s ease-in-out;*/
  box-sizing: border-box;
}
.vir-checkbox .inner:after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 8px;
  margin-left: -2px;
  margin-top: -5px;
  border: 2px solid var(--white-color);
  border-top: 0;
  border-left: 0;
  content: " ";
  opacity: 0;
}
.vir-checkbox .content {
  display: inline-block;
  margin-left: 4px;
}
.vir-checkbox.half-checked .inner:after {
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  background-color: var(--primary-color);
  border: none;
  margin: 0;
  transform: translate(-50%, -50%);
  opacity: 1;
  content: " ";
}
.vir-checkbox.checked .inner {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
}
.vir-checkbox.checked .inner:after {
  transform: rotate(45deg);
  opacity: 1;
}
.vir-checkbox.disabled {
  color: var(--disabled-color);
  cursor: not-allowed;
}
.vir-checkbox.disabled .inner {
  border-color: var(--disable-color);
  background-color: var(--disable-color);
}
.vir-tree {
  position: relative;
  display: block;
  width: 100%;
  user-select: none;
}
.vir-tree-node {
  display: grid;
  grid-template-columns: 16px auto;
  gap: var(--space-4);
  margin: 1px 0;
  font-size: var(--font-size-base);
  cursor: pointer;
  /*transition: all 0.2s ease-in-out;*/
  height: 28px;
  line-height: 28px;
}
.vir-tree-node:hover {
  background-color: var(--gray-color-tree);
}
.vir-tree-node:hover .node-content .node-title {
  color: var(--primary-color);
}
.vir-tree-node .node-arrow {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s ease;
}
.vir-tree-node .node-arrow:empty {
  display: none;
}
.vir-tree-node:has(.node-arrow:empty) {
  grid-template-columns: 1fr;
}
.vir-tree-node .node-arrow .iconfont {
  display: block;
}
.vir-tree-node .node-arrow.expanded {
  transform: rotate(90deg);
}
.vir-tree-node .node-arrow .ico-loading {
  animation: roundLoading 1s linear infinite;
}
.vir-tree-node .node-content {
  display: flex;
  align-items: center;
}
.vir-tree-node .node-content .node-title {
  padding: 0 6px;
  vertical-align: top;
  color: var(--text-color);
  white-space: nowrap;
  /*transition: background-color 0.2s;*/
}
.vir-tree-node .node-content .node-title.selected {
  background-color: var(--assist-color);
}
.vir-tree-node .node-content .node-title.disabled {
  cursor: not-allowed;
  color: var(--disable-color);
}
.node-selected .node-title {
  background-color: #d5e8fc;
}
@keyframes roundLoading {
  0% {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
/* stylelint-enable */
</style>
