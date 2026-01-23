<script lang="ts" setup>
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import {
  type BaseTreeNode,
  type EventParams,
  type KeydownEvent,
  Tree,
  type TreeNodeOptions,
} from "@knime/virtual-tree";

import type { CategoryMetadata } from "@/api/gateway-api/generated-api";
import {
  DraggableNodeTemplate,
  type NavReachedEvent,
  useAddNodeToWorkflow,
} from "@/components/nodeTemplates";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import type { NodeTemplateWithExtendedPorts } from "@/util/dataMappers";
import { hasAllObjectPropertiesDefined } from "@/util/hasAllObjectPropertiesDefined";

import type { NodeCategoryWithExtendedPorts } from "./types";

type ExtendedTreeNodeOptions = TreeNodeOptions & {
  nodeTemplate?: NodeTemplateWithExtendedPorts;
};
type ExtendedBaseTreeNode = BaseTreeNode & { origin: ExtendedTreeNodeOptions };

const mapCategoryToTreeNode = (
  category: CategoryMetadata,
): TreeNodeOptions => ({
  nodeKey: category.path!.join("/"),
  name: category.displayName!,
  hasChildren: true,
});

const mapNodeToTreeNode = (
  node: NodeTemplateWithExtendedPorts,
): ExtendedTreeNodeOptions => ({
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
  navReachedTop: [NavReachedEvent];
}>();

const treeSource = ref<TreeNodeOptions[]>([]);
const initialExpandedKeys = ref<string[]>([]);

const loadTreeNodesFromCache = (
  nodeCategoryCache: Map<string, NodeCategoryWithExtendedPorts>,
  path: string = "",
) => {
  if (!nodeCategoryCache.has(path)) {
    return [];
  }

  const mapCategoryToTreeNodeWithChildren = (
    category: CategoryMetadata,
  ): TreeNodeOptions => ({
    ...mapCategoryToTreeNode(category),
    children: loadTreeNodesFromCache(
      nodeCategoryCache,
      category.path!.join("/"),
    ),
  });

  const { childCategories, nodes } = nodeCategoryCache.get(path)!;

  const treeCategories = (childCategories ?? [])
    .filter(hasAllObjectPropertiesDefined)
    .map((category) => mapCategoryToTreeNodeWithChildren(category));

  const treeNodes = (nodes ?? []).map(mapNodeToTreeNode);

  return [...treeCategories, ...treeNodes];
};

const nodeRepositoryStore = useNodeRepositoryStore();
const { nodeCategoryCache, treeExpandedKeys, showDescriptionForNode } =
  storeToRefs(nodeRepositoryStore);

const fetchRootCategories = async () => {
  const { childCategories } = await nodeRepositoryStore.getNodeCategory({
    categoryPath: [],
  });

  treeSource.value = childCategories!.map(mapCategoryToTreeNode);
};

onMounted(async () => {
  // this component only gets mounted AFTER the node repo has loaded
  // (nodeRepositoryLoaded) thats why we can be sure we can fetch nodes
  // use cache
  treeSource.value = loadTreeNodesFromCache(nodeCategoryCache.value);
  initialExpandedKeys.value = [...treeExpandedKeys.value];

  if (treeSource.value.length > 0) {
    return;
  }

  await fetchRootCategories();
});

const tree = ref<InstanceType<typeof Tree>>();

const focusFirst = () => {
  tree.value?.$el.focus();
};

const onExpandChange = (value: EventParams) => {
  const nodeKey = value.node.key.toString();
  if (value.state) {
    nodeRepositoryStore.addTreeExpandedKey(nodeKey);
  } else {
    nodeRepositoryStore.removeTreeExpandedKey(nodeKey);
  }
};

const { hasNodeCollectionActive } = storeToRefs(useApplicationSettingsStore());

watch(hasNodeCollectionActive, (isActive, wasActive) => {
  if (isActive !== wasActive) {
    nodeRepositoryStore.clearTree();
    fetchRootCategories();
    // reset expanded keys otherwise they are kept (but we have no data anymore)
    initialExpandedKeys.value = [];
  }
});

const loadTreeLevel = async (
  treeNode: BaseTreeNode,
  callback: (children: TreeNodeOptions[]) => void,
) => {
  const { childCategories, nodes } = await nodeRepositoryStore.getNodeCategory({
    categoryPath: treeNode.key.toString().split("/"),
  });

  callback([
    ...childCategories!.map(mapCategoryToTreeNode),
    ...nodes!.map(mapNodeToTreeNode),
  ]);
};

const onShowNodeDescription = (treeNode: BaseTreeNode) => {
  const { nodeTemplate } = treeNode.origin as ExtendedTreeNodeOptions;
  if (nodeTemplate) {
    emit("showNodeDescription", {
      nodeTemplate,
      isDescriptionActive: showDescriptionForNode.value?.id === nodeTemplate.id,
    });
  }
};

const { addNodeWithAutoPositioning } = useAddNodeToWorkflow();
const addTreeNodeToWorkflow = (treeNode: BaseTreeNode) => {
  const nodeFactory = (treeNode.origin as ExtendedTreeNodeOptions)?.nodeTemplate
    ?.nodeFactory;

  if (nodeFactory) {
    addNodeWithAutoPositioning(nodeFactory);
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

defineExpose({ focusFirst });
</script>

<template>
  <Tree
    ref="tree"
    virtual
    class="node-category-tree"
    :source="treeSource"
    :load-data="loadTreeLevel"
    :selectable="false"
    :expanded-keys="initialExpandedKeys"
    @expand-change="onExpandChange"
    @keydown="onTreeKeydown"
  >
    <template #leaf="{ treeNode }: { treeNode: ExtendedBaseTreeNode }">
      <DraggableNodeTemplate
        class="node-template-component"
        :node-template="treeNode.origin.nodeTemplate!"
        :is-highlighted="false"
        :is-selected="false"
        :is-description-active="
          showDescriptionForNode?.id === treeNode.origin.nodeTemplate!.id
        "
        display-mode="tree"
        @show-node-description="onShowNodeDescription(treeNode)"
      />
    </template>
  </Tree>
</template>

<style lang="postcss" scoped>
.node-category-tree {
  scrollbar-gutter: stable;
  height: 100%;
  overflow: auto;
  padding: 0 var(--space-8) var(--sidebar-panel-padding)
    var(--sidebar-panel-padding);
}

/** move padding to inner component to have user interactions on the whole line (hover, drag and dblclick) */
:deep(.vir-tree-node):has(.leaf) {
  padding-left: 0;
}

.node-template-component {
  padding-left: calc(var(--vir-tree-level, 0) * var(--vir-tree-indent, 18px));
}
</style>
