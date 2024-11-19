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
import { isLocalProvider, isServerProvider } from "@/store/spaces/util";

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

type AddToTreeCallback = (children: TreeNodeOptions[]) => void;

interface Props {
  providerRules?: {
    restrictedTo?: Array<string>;
    exclude?: Array<string>;
  };
}

const MAX_NAME_LENGTH = 300;

const props = withDefaults(defineProps<Props>(), {
  providerRules: () => ({}),
});

const emit = defineEmits<{
  selectChange: [value: SpaceTreeSelection];
}>();

const store = useStore();

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
  { spaceId, spaceProviderId },
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

const mapSpaceToTree = (space: SpaceProviderNS.Space, { spaceProviderId }) => ({
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
  { spaceProviderId },
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

const loadWorkflowGroup = async (
  group: FullSpacePath,
  addToTree: AddToTreeCallback,
) => {
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
  } catch (error) {
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
        name: "Could not load. Please check the log for details.",
        title: error ? `Error: ${error}` : null,
        hasChildren: false,
        customSlot: "providerFailed",
      },
    ]);
  };
  try {
    const currentProvider = store.state.spaces.spaceProviders![spaceProviderId];

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

    const reloadProviderSpaces = async () => {
      await store.dispatch("spaces/reloadProviderSpaces", {
        id: spaceProviderId,
      });
      return store.state.spaces.spaceProviders![spaceProviderId];
    };

    const reloadedrovider = await reloadProviderSpaces();
    addToTree(
      reloadedrovider.spaceGroups.map((group) =>
        mapSpaceGroupToTree(group, { spaceProviderId }),
      ),
    );
  } catch (error) {
    fail(error);
  }
};

const isProviderConnected = (
  spaceProviderId: SpaceProviderId["spaceProviderId"],
) => store.state.spaces.spaceProviders?.[spaceProviderId]?.connected;

const loadProvider = async (
  spaceProviderId: SpaceProviderId["spaceProviderId"],
  addToTree: AddToTreeCallback,
) => {
  const fail = (error?: unknown) => {
    addToTree([
      {
        nodeKey: `error_loadProvider_${spaceProviderId}`,
        name: "Could not connect. Please check the log for details.",
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
          providerData: store.state.spaces.spaceProviders![spaceProviderId],
        }
      : await store.dispatch("spaces/connectProvider", { spaceProviderId });

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

const tree = ref<InstanceType<typeof Tree>>();

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
