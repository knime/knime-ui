<script lang="ts" setup>
import Tree from "@/components/common/tree/Tree.vue";

import {
  type NodeKey,
  type TreeNodeOptions,
  type BaseTreeNode,
  type KeydownEvent,
} from "@/components/common/tree/types";

import { computed, onMounted, ref } from "vue";
import { useStore } from "@/composables/useStore";
import ScrollViewContainer from "./ScrollViewContainer.vue";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import DraggableNodeTemplate from "./DraggableNodeTemplate.vue";
import type { NavigationKey } from "./NodeList.vue";
import { useAddNodeToWorkflow } from "@/components/nodeRepository/useAddNodeToWorkflow";

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

const tree = ref<InstanceType<typeof Tree>>();

const focusFirst = () => {
  tree.value?.$el.focus();
};

const loadedNodeIds = ref<Map<NodeKey, string[]>>(new Map<NodeKey, string[]>());

const getExpandedNodeIds = () => {
  const expandedKeys = tree.value!.getExpandedKeys() ?? [];
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

const addNodeToWorkflow = useAddNodeToWorkflow();
const addTreeNodeToWorkflow = (treeNode: BaseTreeNode) => {
  const nodeFactory = treeNode.origin?.nodeTemplate?.nodeFactory;
  if (nodeFactory) {
    addNodeToWorkflow({ nodeFactory });
  }
};

const onTreeKeydown = ({ event, node: treeNode }: KeydownEvent) => {
  const { key } = event;

  switch (key) {
    case "Enter":
      addTreeNodeToWorkflow(treeNode);
      break;
    case "i":
      onShowNodeDescription(treeNode);
      break;
  }
};

defineExpose({ focusFirst, getExpandedNodeIds });
</script>

<template>
  <ScrollViewContainer class="results" :initial-position="0">
    <div class="scroll-container-content">
      <Tree
        ref="tree"
        :source="rootCategories"
        :load-data="loadData"
        :selectable="false"
        @keydown="onTreeKeydown"
      >
        <template
          #leaf="{
            treeNode,
            hasFocus,
          }: {
            treeNode: BaseTreeNode;
            hasFocus: boolean;
          }"
        >
          <DraggableNodeTemplate
            :node-template="treeNode.origin.nodeTemplate"
            :is-highlighted="false"
            :is-selected="hasFocus"
            :is-description-active="
              showDescriptionForNode?.id === treeNode.origin.nodeTemplate.id
            "
            display-mode="tree"
            @show-node-description="onShowNodeDescription(treeNode)"
          />
        </template>
      </Tree>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.scroll-container-content {
  padding: 0 20px 15px;
  font-family: "Roboto Condensed", sans-serif;
}
</style>
