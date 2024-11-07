<script lang="ts" setup>
import { computed, markRaw, ref } from "vue";

import { Button, Pill } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/circle-close.svg";
import {
  type BaseTreeNode,
  type NodeKey,
  Tree,
  type TreeNodeOptions,
} from "@knime/virtual-tree";

import type {
  FullSpacePath,
  SpaceProviderId,
  SpaceProviderNS,
} from "@/api/custom-types";
import type { WorkflowGroupContent } from "@/api/gateway-api/generated-api";
import { SpaceItem } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { isLocalProvider } from "@/store/spaces/util";

import { formatSpaceProviderName } from "./formatSpaceProviderName";
import { spaceItemIconRenderer } from "./spaceItemIconRenderer";
import { useSpaceIcons } from "./useSpaceIcons";

type SpaceTreeItem = FullSpacePath & {
  type: "item";
  isWorkflowContainer: boolean;
};

type SpaceTreeGroup = {
  type: "group";
  groupData: SpaceProviderNS.SpaceGroup;
};

type SpaceTreeProvider = SpaceProviderId & {
  type: "provider";
};

export type SpaceTreeSelection =
  | SpaceTreeItem
  | SpaceTreeGroup
  | SpaceTreeProvider
  | null;

interface Props {
  providerRules?: {
    restrictedTo?: Array<string>;
    exclude?: Array<string>;
  };
}

const LOCAL_SPACEPROVIDER_ID = "local";

const props = withDefaults(defineProps<Props>(), {
  providerRules: () => ({}),
});

const emit = defineEmits<{
  selectChange: [value: SpaceTreeSelection];
}>();

const treeSource = ref<TreeNodeOptions[]>([]);
const store = useStore();

const { getSpaceIcon, getSpaceProviderIcon, getSpaceGroupIcon } =
  useSpaceIcons();

const mapSpaceItemsToTreeNodes = (
  spaceItem: SpaceItem,
  { spaceId, spaceProviderId },
) => ({
  nodeKey: `item_${spaceItem.id}`,
  name: spaceItem.name,
  icon: markRaw(spaceItemIconRenderer(spaceItem.type)),
  itemId: spaceItem.id,
  spaceId,
  spaceProviderId,
  hasChildren: spaceItem.type === SpaceItem.TypeEnum.WorkflowGroup,
});

const mapSpacesToTreeNodes = (
  space: SpaceProviderNS.Space,
  { spaceProviderId },
) => ({
  nodeKey: `space_${space.id}`,
  name: space.name,
  icon: markRaw(getSpaceIcon(space)),
  spaceId: space.id,
  itemId: "root",
  spaceProviderId,
  hasChildren: true,
});

const mapSpaceGroupToTreeNode = (
  spaceGroup: SpaceProviderNS.SpaceGroup,
  { spaceProviderId },
) => ({
  nodeKey: `group_${spaceGroup.id}`,
  name: spaceGroup.name,
  hasChildren: true,
  icon: markRaw(getSpaceGroupIcon(spaceGroup)),
  groupData: spaceGroup,
  children: spaceGroup.spaces?.map((space) =>
    mapSpacesToTreeNodes(space, { spaceProviderId }),
  ),
});

const mapSpaceProviderToTreeNode = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
): TreeNodeOptions => {
  if (isLocalProvider(spaceProvider)) {
    return mapSpacesToTreeNodes(spaceProvider.spaceGroups[0].spaces[0], {
      spaceProviderId: spaceProvider.id,
    });
  } else {
    return {
      nodeKey: `provider_${spaceProvider.id}`,
      name: formatSpaceProviderName(spaceProvider),
      hasChildren: true,
      icon: markRaw(getSpaceProviderIcon(spaceProvider)),
      spaceProviderId: spaceProvider.id,
      children: spaceProvider.spaceGroups?.map((group) =>
        mapSpaceGroupToTreeNode(group, { spaceProviderId: spaceProvider.id }),
      ),
    };
  }
};

const filteredSpaceProviders = computed(() => {
  const spaceProviders = Object.values(store.state.spaces.spaceProviders ?? {});
  return spaceProviders.filter(
    ({ id }) =>
      (!props.providerRules.restrictedTo ||
        props.providerRules.restrictedTo.includes(id)) &&
      !props.providerRules.exclude?.includes(id),
  );
});

treeSource.value = filteredSpaceProviders.value.map(mapSpaceProviderToTreeNode);

const loadTreeLevel = async (
  treeNode: BaseTreeNode,
  callback: (children: TreeNodeOptions[]) => void,
) => {
  const { spaceProviderId, spaceId, itemId } = treeNode.origin;

  if (itemId && spaceId && spaceProviderId) {
    const workflowGroupContent: WorkflowGroupContent = await store.dispatch(
      "spaces/fetchWorkflowGroupContentByIdTriplet",
      {
        spaceProviderId,
        spaceId,
        itemId,
      },
    );

    if (workflowGroupContent.items.length > 0) {
      callback(
        workflowGroupContent.items.map((item) =>
          mapSpaceItemsToTreeNodes(item, {
            spaceProviderId,
            spaceId,
          }),
        ),
      );
    } else {
      callback([
        {
          nodeKey: `empty_${spaceProviderId}${spaceId}${itemId}`,
          name: "Folder is empty",
          customSlot: "empty",
        },
      ]);
    }
    return;
  }

  const fail = (error?: unknown) => {
    callback([
      {
        nodeKey: `error_connect_provider_${spaceProviderId}`,
        name: "Connect failed…",
        title: error ? `Error: ${error}` : null,
        hasChildren: false,
        customSlot: "loginFailed",
      },
    ]);
  };

  if (spaceProviderId) {
    // handle sign in request
    try {
      const connectedProvider = await store.dispatch("spaces/connectProvider", {
        spaceProviderId,
      });
      const isAuthenticated =
        store.state.spaces.spaceProviders?.[spaceProviderId]?.connected;
      if (isAuthenticated) {
        callback(
          connectedProvider.spaceGroups.map((group) =>
            mapSpaceGroupToTreeNode(group, { spaceProviderId }),
          ),
        );
        return;
      }
    } catch (error) {
      fail(error);
      return;
    }

    // we just can assume it went not well, there is NO way to check that as the flow is java ui based only atm
    fail();
  }
};

const tree = ref<InstanceType<typeof Tree>>();

const retryConnectProvider = (treeNodeKey: NodeKey) => {
  tree.value?.clearChildren(treeNodeKey);
  tree.value?.loadChildren(treeNodeKey);
};

const getSelectionType = (
  selectedNode: BaseTreeNode | undefined,
): "item" | "group" | "provider" | null => {
  if (!selectedNode || typeof selectedNode.origin.nodeKey !== "string") {
    return null;
  }

  const nodeKey: String = selectedNode.origin.nodeKey;
  if (nodeKey.startsWith("item_") || nodeKey.startsWith("space_")) {
    return "item";
  }

  if (nodeKey.startsWith("group_")) {
    return "group";
  }

  if (nodeKey.startsWith("provider_")) {
    return "provider";
  }

  return null;
};

const onSelectChange = ({ node }: { node: BaseTreeNode | undefined }) => {
  if (!node) {
    emit("selectChange", null);
    return;
  }

  const type = getSelectionType(node);
  const { itemId, spaceId, spaceProviderId, groupData, hasChildren } =
    node.origin;

  if (type === "item") {
    emit("selectChange", {
      type,
      itemId,
      spaceId,
      spaceProviderId,
      isWorkflowContainer: hasChildren!,
    });
    return;
  }

  if (type === "group") {
    emit("selectChange", { type, groupData });
    return;
  }

  if (type === "provider") {
    emit("selectChange", { type, spaceProviderId });
  }
};
</script>

<template>
  <Tree
    ref="tree"
    :source="treeSource"
    :load-data="loadTreeLevel"
    @select-change="onSelectChange"
  >
    <template #loginFailed="{ treeNode }: { treeNode: BaseTreeNode }">
      <Pill variant="error" :title="treeNode.origin.title"
        ><CloseIcon /> {{ treeNode.name }}
      </Pill>
      <Button
        class="retry-button"
        compact
        with-border
        @click="() => retryConnectProvider(treeNode.parentKey!)"
        >Retry</Button
      >
    </template>
    <template #empty>
      <span class="empty-folder">(Folder is empty)</span>
    </template>
  </Tree>
</template>

<style lang="postcss" scoped>
.empty-folder {
  color: var(--knime-gray-dark);
  font-style: italic;
  pointer-events: none;
}

.retry-button.button.compact.with-border {
  height: 20px;
  line-height: 20px;
  padding: 0;
  display: flex;
  place-content: center center;
}
</style>
