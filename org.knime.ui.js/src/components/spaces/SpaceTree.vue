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

const props = withDefaults(defineProps<Props>(), {
  providerRules: () => ({}),
});

const emit = defineEmits<{
  selectChange: [value: SpaceTreeSelection];
}>();

const store = useStore();

const {
  getSpaceIcon,
  getSpaceProviderIcon,
  getSpaceGroupIcon,
  getSpaceItemIcon,
} = useSpaceIcons();

const mapSpaceItemToTree = (
  spaceItem: SpaceItem,
  { spaceId, spaceProviderId },
) => ({
  type: "item",
  nodeKey: `item_${spaceProviderId}_${spaceId}_${spaceItem.id}`,
  name: spaceItem.name,
  icon: markRaw(getSpaceItemIcon(spaceItem.type)),
  itemId: spaceItem.id,
  spaceId,
  spaceProviderId,
  hasChildren: spaceItem.type === SpaceItem.TypeEnum.WorkflowGroup,
});

const mapSpaceToTree = (space: SpaceProviderNS.Space, { spaceProviderId }) => ({
  type: "item",
  nodeKey: `space_${spaceProviderId}_${space.id}`,
  name: space.name,
  icon: markRaw(getSpaceIcon(space)),
  spaceId: space.id,
  itemId: "root",
  spaceProviderId,
  hasChildren: true,
});

const mapSpaceGroupToTree = (
  spaceGroup: SpaceProviderNS.SpaceGroup,
  { spaceProviderId },
) => ({
  type: "group",
  nodeKey: `group_${spaceProviderId}_${spaceGroup.id}`,
  name: spaceGroup.name,
  hasChildren: true,
  icon: markRaw(getSpaceGroupIcon(spaceGroup)),
  groupData: spaceGroup,
  children: spaceGroup.spaces?.map((space) =>
    mapSpaceToTree(space, { spaceProviderId }),
  ),
});

const mapSpaceProviderToTree = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
): TreeNodeOptions => {
  if (isLocalProvider(spaceProvider)) {
    return mapSpaceToTree(spaceProvider.spaceGroups[0].spaces[0], {
      spaceProviderId: spaceProvider.id,
    });
  } else {
    return {
      type: "provider",
      nodeKey: `provider_${spaceProvider.id}`,
      name: formatSpaceProviderName(spaceProvider),
      hasChildren: true,
      icon: markRaw(getSpaceProviderIcon(spaceProvider)),
      spaceProviderId: spaceProvider.id,
      children: spaceProvider.spaceGroups?.map((group) =>
        mapSpaceGroupToTree(group, { spaceProviderId: spaceProvider.id }),
      ),
    };
  }
};

const filteredSpaceProviders = computed(() => {
  let spaceProviders = Object.values(store.state.spaces.spaceProviders ?? {});

  if (props.providerRules.restrictedTo) {
    spaceProviders = spaceProviders.filter(({ id }) =>
      props.providerRules.restrictedTo!.includes(id),
    );
  }

  if (props.providerRules.exclude) {
    spaceProviders = spaceProviders.filter(
      ({ id }) => !props.providerRules.exclude?.includes(id),
    );
  }
  return spaceProviders;
});

const treeSource = ref<TreeNodeOptions[]>(
  filteredSpaceProviders.value.map(mapSpaceProviderToTree),
);

const loadWorkflowGroup = async (group: FullSpacePath, callback) => {
  const { spaceProviderId, spaceId, itemId } = group;
  try {
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
          mapSpaceItemToTree(item, {
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
  } catch (error) {
    callback([
      {
        nodeKey: `error_loadWorkflowGroup_${spaceProviderId}${spaceId}${itemId}`,
        name: "Error loading folder",
        customSlot: "empty",
      },
    ]);
  }
};

const connectProvider = async (
  spaceProviderId: SpaceProviderId["spaceProviderId"],
  callback,
) => {
  const fail = (error?: unknown) => {
    callback([
      {
        nodeKey: `error_connectProvider_${spaceProviderId}`,
        name: "Could not connect. Please check the log for details.",
        title: error ? `Error: ${error}` : null,
        hasChildren: false,
        customSlot: "loginFailed",
      },
    ]);
  };

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
          mapSpaceGroupToTree(group, { spaceProviderId }),
        ),
      );
      return;
    }
  } catch (error) {
    fail(error);
    return;
  }

  // we just can assume it didn't go well, there is NO way to check as the flow is java ui based only atm
  fail();
};

const loadTreeLevel = (
  treeNode: BaseTreeNode,
  callback: (children: TreeNodeOptions[]) => void,
) => {
  const { spaceProviderId, spaceId, itemId } = treeNode.origin;

  if (itemId && spaceId && spaceProviderId) {
    loadWorkflowGroup({ spaceProviderId, spaceId, itemId }, callback);
  } else if (spaceProviderId) {
    connectProvider(spaceProviderId, callback);
  }
};

const tree = ref<InstanceType<typeof Tree>>();

const retryConnectProvider = (treeNodeKey: NodeKey) => {
  tree.value?.clearChildren(treeNodeKey);
  tree.value?.loadChildren(treeNodeKey);
};

const onSelectChange = ({ node }: { node: BaseTreeNode | undefined }) => {
  if (!node) {
    emit("selectChange", null);
    return;
  }

  const { type, itemId, spaceId, spaceProviderId, groupData, hasChildren } =
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
