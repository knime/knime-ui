<script lang="ts" setup>
import { computed, markRaw, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";

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
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import {
  formatSpaceProviderName,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";

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

type AddToTreeCallback = (children: TreeNodeOptions[]) => void;

interface Props {
  providerRules?: {
    restrictedTo?: Array<string>;
    exclude?: Array<string>;
  };
  autoExpand?: boolean;
}

const MAX_NAME_LENGTH = 300;

const props = withDefaults(defineProps<Props>(), {
  providerRules: () => ({}),
});

const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
const { reloadProviderSpaces } = useSpaceProvidersStore();
const { fetchWorkflowGroupContentByIdTriplet } = useSpaceOperationsStore();
const { connectProvider } = useSpaceAuthStore();

const emit = defineEmits<{
  selectChange: [value: SpaceTreeSelection];
}>();

const isProviderConnected = (
  spaceProviderId: SpaceProviderId["spaceProviderId"],
) => spaceProviders.value?.[spaceProviderId]?.connected;

const truncate = (text: string) => {
  return text.length <= MAX_NAME_LENGTH
    ? text
    : `${text.slice(0, MAX_NAME_LENGTH)} …`;
};

const {
  getSpaceIcon,
  getSpaceProviderIcon,
  getSpaceGroupIcon,
  getSpaceItemIcon,
} = useSpaceIcons();

const mapSpaceItemToTree = (
  spaceItem: SpaceItem,
  { spaceId, spaceProviderId }: { spaceId: string; spaceProviderId: string },
) => ({
  type: "item",
  nodeKey: `item_${spaceProviderId}_${spaceId}_${spaceItem.id}`,
  name: truncate(spaceItem.name),
  icon: markRaw(getSpaceItemIcon(spaceItem.type)),
  itemId: spaceItem.id,
  spaceId,
  spaceProviderId,
  hasChildren: spaceItem.type === SpaceItem.TypeEnum.WorkflowGroup,
});

const mapSpaceToTree = (
  space: SpaceProviderNS.Space,
  { spaceProviderId }: { spaceProviderId: string },
) => ({
  type: "item",
  nodeKey: `space_${spaceProviderId}_${space.id}`,
  name: truncate(space.name),
  icon: markRaw(getSpaceIcon(space)),
  spaceId: space.id,
  itemId: "root",
  spaceProviderId,
  hasChildren: true,
});

const mapSpaceGroupToTree = (
  spaceGroup: SpaceProviderNS.SpaceGroup,
  { spaceProviderId }: { spaceProviderId: string },
) => ({
  type: "group",
  nodeKey: `group_${spaceProviderId}_${spaceGroup.id}`,
  name: truncate(spaceGroup.name),
  hasChildren: true,
  icon: markRaw(getSpaceGroupIcon(spaceGroup)),
  groupData: spaceGroup,
  children:
    spaceGroup.spaces.length > 0
      ? spaceGroup.spaces?.map((space) =>
          mapSpaceToTree(space, { spaceProviderId }),
        )
      : [
          {
            nodeKey: `empty_${spaceProviderId}_${spaceGroup.id}`,
            name: "Group is empty",
            customSlot: "info",
          },
        ],
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
      name: truncate(formatSpaceProviderName(spaceProvider)),
      hasChildren: true,
      icon: markRaw(getSpaceProviderIcon(spaceProvider)),
      spaceProviderId: spaceProvider.id,
    };
  }
};

const filteredSpaceProviders = computed(() => {
  let newSpaceProviders = Object.values(spaceProviders.value ?? {});

  if (props.providerRules.restrictedTo) {
    newSpaceProviders = newSpaceProviders.filter(({ id }) =>
      props.providerRules.restrictedTo!.includes(id),
    );
  }

  if (props.providerRules.exclude) {
    newSpaceProviders = newSpaceProviders.filter(
      ({ id }) => !props.providerRules.exclude?.includes(id),
    );
  }
  return newSpaceProviders;
});

const tree = ref<InstanceType<typeof Tree>>();
const treeSource = ref<TreeNodeOptions[]>(
  filteredSpaceProviders.value.map(mapSpaceProviderToTree),
);

const autoExpandTree = () => {
  nextTick(() => {
    // If there is a single (already authenticated) root item ...
    if (
      treeSource.value.length === 1 &&
      (treeSource.value[0].type !== "provider" ||
        isProviderConnected(treeSource.value[0].spaceProviderId))
    ) {
      // ... automatically expand it
      tree.value?.toggleExpand(
        // This also works in the case of 'node.type !== "provider"' (e.g. local)
        treeSource.value[0].nodeKey,
        true,
      );
    }
  });
};

if (props.autoExpand) {
  autoExpandTree();
}

const loadWorkflowGroup = async (
  group: FullSpacePath,
  addToTree: AddToTreeCallback,
) => {
  const { spaceProviderId, spaceId, itemId } = group;
  try {
    const workflowGroupContent: WorkflowGroupContent =
      await fetchWorkflowGroupContentByIdTriplet({
        spaceProviderId,
        spaceId,
        itemId,
      });

    if (workflowGroupContent.items.length > 0) {
      addToTree(
        workflowGroupContent.items.map((item) =>
          mapSpaceItemToTree(item, {
            spaceProviderId,
            spaceId,
          }),
        ),
      );
    } else {
      addToTree([
        {
          nodeKey: `empty_${spaceProviderId}${spaceId}${itemId}`,
          name: "Folder is empty",
          customSlot: "info",
        },
      ]);
    }
  } catch (_error) {
    addToTree([
      {
        nodeKey: `error_loadWorkflowGroup_${spaceProviderId}${spaceId}${itemId}`,
        name: "Error loading folder",
        customSlot: "info",
      },
    ]);
  }
};

const loadConnectedProvider = async (
  spaceProviderId: SpaceProviderId["spaceProviderId"],
  addToTree: AddToTreeCallback,
) => {
  const fail = (error?: unknown) => {
    addToTree([
      {
        nodeKey: `error_loadConnectedProvider_${spaceProviderId}`,
        name: "Could not load. Check the log for details.",
        title: error ? `Error: ${error}` : null,
        hasChildren: false,
        customSlot: "providerFailed",
      },
    ]);
  };
  try {
    const currentProvider = spaceProviders.value![spaceProviderId];

    if (isServerProvider(currentProvider)) {
      if (currentProvider.spaceGroups.length !== 1) {
        consola.error(
          "Unexpected server provider state: Expected exactly one spaceGroup",
          currentProvider,
        );
        fail();
        return;
      }

      addToTree(
        currentProvider.spaceGroups[0].spaces.map((space) =>
          mapSpaceToTree(space, { spaceProviderId }),
        ),
      );
      return;
    }

    const reloadProviderSpacesFn = async () => {
      await reloadProviderSpaces({
        id: spaceProviderId,
      });
      return spaceProviders.value![spaceProviderId];
    };

    const reloadedProvider = await reloadProviderSpacesFn();
    addToTree(
      reloadedProvider.spaceGroups.map((group) =>
        mapSpaceGroupToTree(group, { spaceProviderId }),
      ),
    );
  } catch (error) {
    fail(error);
  }
};

const loadProvider = async (
  spaceProviderId: SpaceProviderId["spaceProviderId"],
  addToTree: AddToTreeCallback,
) => {
  const fail = (error?: unknown) => {
    addToTree([
      {
        nodeKey: `error_loadProvider_${spaceProviderId}`,
        name: "Could not load. Check the log for details.",
        title: error ? `Error: ${error}` : null,
        hasChildren: false,
        customSlot: "providerFailed",
      },
    ]);
  };

  // handle sign in request
  try {
    const { isConnected, providerData } = isProviderConnected(spaceProviderId)
      ? {
          isConnected: true,
          providerData: spaceProviders.value![spaceProviderId],
        }
      : await connectProvider({ spaceProviderId });

    if (isConnected) {
      loadConnectedProvider(providerData.id, addToTree);
      return;
    }
  } catch (error) {
    fail(error);
    return;
  }

  // no previous path lead to successfully loading the data
  fail();
};

const loadTreeLevel = (
  treeNode: BaseTreeNode,
  addToTree: AddToTreeCallback,
) => {
  const { spaceProviderId, spaceId, itemId } = treeNode.origin;

  if (itemId && spaceId && spaceProviderId) {
    loadWorkflowGroup({ spaceProviderId, spaceId, itemId }, addToTree);
    return;
  }

  if (spaceProviderId) {
    loadProvider(spaceProviderId, addToTree);
    return;
  }

  addToTree([
    {
      nodeKey: `error_loadWorkflowGroup_${spaceProviderId}${spaceId}${itemId}`,
      name: "Error loading contents",
      customSlot: "info",
    },
  ]);
};

const retryLoadProvider = (treeNodeKey: NodeKey) => {
  const RETRY_DELAY_MS = 200;

  tree.value?.clearChildren(treeNodeKey);
  // Use a short timeout, so the error briefly disappears visually,
  // even if the retry fails as well
  setTimeout(() => {
    tree.value?.loadChildren(treeNodeKey);
  }, RETRY_DELAY_MS);
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

  emit("selectChange", null);
};
</script>

<template>
  <Tree
    ref="tree"
    :source="treeSource"
    :load-data="loadTreeLevel"
    @select-change="onSelectChange"
  >
    <template #providerFailed="{ treeNode }: { treeNode: BaseTreeNode }">
      <Pill variant="error" :title="treeNode.origin.title"
        ><CloseIcon /> {{ treeNode.name }}
      </Pill>
      <Button
        class="retry-button"
        compact
        with-border
        @click.stop="() => retryLoadProvider(treeNode.parentKey!)"
        >Retry</Button
      >
    </template>
    <template #info="{ treeNode }: { treeNode: BaseTreeNode }">
      <span class="info-node">({{ treeNode.name }})</span>
    </template>
  </Tree>
</template>

<style lang="postcss" scoped>
.info-node {
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
