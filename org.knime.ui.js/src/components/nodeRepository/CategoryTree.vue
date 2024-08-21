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

const mapCategoryToTreeNode = (category: {
  path: string[];
  displayName: string;
}): TreeNodeOptions => ({
  nodeKey: category.path.join("/"),
  name: category.displayName,
  hasChildren: true,
});

const mapNodeToTreeNode = (
  node: NodeTemplateWithExtendedPorts,
): TreeNodeOptions => ({
  nodeKey: `node_${node.id}`,
  name: node.name,
  nodeTemplate: node,
  hasChildren: false,
});

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

const rootCategories = ref<TreeNodeOptions[]>([]);

onMounted(async () => {
  const { childCategories } = await store.dispatch(
    "nodeRepository/getNodeCategory",
    {
      categoryPath: [],
    },
  );

  rootCategories.value = childCategories.map(mapCategoryToTreeNode);
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

const loadTreeLevel = async (
  treeNode: BaseTreeNode,
  callback: (children: TreeNodeOptions[]) => void,
) => {
  const { childCategories, nodes } = await store.dispatch(
    "nodeRepository/getNodeCategory",
    { categoryPath: treeNode.key.toString().split("/") },
  );

  // remember nodeIds for visible check
  const nodeIds = nodes.map(({ id }: { id: string }) => id);
  loadedNodeIds.value.set(treeNode.key, nodeIds);

  callback([
    ...childCategories.map(mapCategoryToTreeNode),
    ...nodes.map(mapNodeToTreeNode),
  ]);
};

const showDescriptionForNode = computed(
  () => store.state.nodeRepository.showDescriptionForNode,
);

const onShowNodeDescription = (treeNode: BaseTreeNode) => {
  const { nodeTemplate } = treeNode.origin;
  if (nodeTemplate) {
    emit("showNodeDescription", {
      nodeTemplate,
      isDescriptionActive: showDescriptionForNode.value?.id === nodeTemplate.id,
    });
  }
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
        :load-data="loadTreeLevel"
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
  padding: 0 4px 16px 20px;
  font-family: "Roboto Condensed", sans-serif;
}
</style>
