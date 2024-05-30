<script setup lang="ts">
import { ref, computed, watch, toRef } from "vue";
import { useRouter } from "vue-router";

import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import FolderIcon from "webapps-common/ui/assets/img/icons/folder.svg";
import FileTextIcon from "webapps-common/ui/assets/img/icons/file-text.svg";
import WorkflowIcon from "webapps-common/ui/assets/img/icons/workflow.svg";
import NodeWorkflowIcon from "webapps-common/ui/assets/img/icons/node-workflow.svg";
import WorkflowNodeStackIcon from "webapps-common/ui/assets/img/icons/workflow-node-stack.svg";
import FileExplorer from "webapps-common/ui/components/FileExplorer/FileExplorer.vue";
import type { FileExplorerItem } from "webapps-common/ui/components/FileExplorer/types";
import { useToasts } from "webapps-common/ui/services/toast";

import {
  SpaceItem,
  type WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import SmartLoader from "@/components/common/SmartLoader.vue";
import SpaceExplorerContextMenu from "@/components/spaces/SpaceExplorerContextMenu.vue";

import DeploymentsModal from "./DeploymentsModal/DeploymentsModal.vue";
import SpaceExplorerBreadcrumbs from "./SpaceExplorerBreadcrumbs.vue";
import SpaceExplorerDeleteItemModal from "./SpaceExplorerDeleteItemModal.vue";
import { useCustomDragPreview } from "./useCustomDragPreview";
import { useMovingItems } from "./useMovingItems";

type FileExplorerItemWithMeta = FileExplorerItem<{ type: SpaceItem.TypeEnum }>;

const itemIconRenderer = (item: FileExplorerItem) => {
  const typeIcons = {
    [SpaceItem.TypeEnum.WorkflowGroup]: FolderIcon,
    [SpaceItem.TypeEnum.Workflow]: WorkflowIcon,
    [SpaceItem.TypeEnum.Component]: NodeWorkflowIcon,
    [SpaceItem.TypeEnum.WorkflowTemplate]: WorkflowNodeStackIcon,
    [SpaceItem.TypeEnum.Data]: FileTextIcon,
  };

  return typeIcons[(item as FileExplorerItemWithMeta).meta!.type];
};

interface Props {
  projectId: string;
  mode?: "normal" | "mini";
  selectedItemIds: string[];
  clickOutsideException?: HTMLElement | null;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "normal",
  clickOutsideException: null,
});

const $emit = defineEmits<{
  changeDirectory: [pathId: string];
  "update:selectedItemIds": [selectedItemIds: string[]];
}>();

const store = useStore();
const $router = useRouter();
const $toast = useToasts();

const projectId = toRef(props, "projectId");

const deleteModal = ref<{ isActive: boolean; items: FileExplorerItem[] }>({
  isActive: false,
  items: [],
});

// spaces
const isLoadingContent = computed(() => store.state.spaces.isLoadingContent);
const activeRenamedItemId = computed(
  () => store.state.spaces.activeRenamedItemId,
);
const getOpenedWorkflowItems = computed(
  () => store.getters["spaces/getOpenedWorkflowItems"],
);
const getOpenedFolderItems = computed(
  () => store.getters["spaces/getOpenedFolderItems"],
);
const getWorkflowGroupContent = computed(
  () => store.getters["spaces/getWorkflowGroupContent"],
);

const activeWorkflowGroup = computed<WorkflowGroupContent | null>(() => {
  return getWorkflowGroupContent.value(props.projectId);
});

const openedWorkflowItems = computed<string[]>(() => {
  return getOpenedWorkflowItems.value(props.projectId);
});

const openedFolderItems = computed<string[]>(() => {
  return getOpenedFolderItems.value(props.projectId);
});

const fileExplorerItems = computed<Array<FileExplorerItemWithMeta>>(() => {
  if (!activeWorkflowGroup.value) {
    return [];
  }

  return activeWorkflowGroup.value.items.map((item) => {
    const isOpen =
      openedWorkflowItems.value.includes(item.id) ||
      openedFolderItems.value.includes(item.id);

    return {
      ...item,
      isOpen,
      isDirectory: item.type === SpaceItem.TypeEnum.WorkflowGroup,
      isOpenableFile:
        item.type === SpaceItem.TypeEnum.Workflow ||
        item.type === SpaceItem.TypeEnum.Component,
      canBeRenamed: !isOpen,
      canBeDeleted: !openedFolderItems.value.includes(item.id),
      meta: {
        type: item.type,
      },
    };
  });
});

const fullPath = computed(() => {
  if (!activeWorkflowGroup.value) {
    return "";
  }
  const { path } = activeWorkflowGroup.value;
  return ["home"].concat(path.map(({ name }) => name)).join("/");
});

const fetchWorkflowGroupContent = async () => {
  if (props.projectId === null) {
    return;
  }

  await store.dispatch("spaces/fetchWorkflowGroupContent", {
    projectId: props.projectId,
  });
};

// spaceId and itemId (folder) are based on the projectId but might change even with the same projectId (change dir)
watch(
  computed(() => store.state.spaces.projectPath[props.projectId]),
  async () => {
    await fetchWorkflowGroupContent();
  },
  { immediate: true, deep: true },
);

const onChangeDirectory = (pathId: string) => {
  $emit("changeDirectory", pathId);
};

const onOpenFile = async ({ id }: FileExplorerItem) => {
  const { spaceProviderId, spaceId } =
    store.state.spaces.projectPath[props.projectId];

  await store.dispatch("spaces/openProject", {
    providerId: spaceProviderId,
    spaceId,
    itemId: id,
    // send in router, so it can be used to navigate to an already open workflow
    $router,
  });
};

const onRenameFile = ({
  itemId,
  newName,
}: {
  itemId: string;
  newName: string;
}) => {
  store
    .dispatch("spaces/renameItem", {
      projectId: props.projectId,
      itemId,
      newName,
    })
    .catch(() => {
      $toast.show({
        type: "error",
        headline: "Rename failed",
        message: `Could not rename the selected item with the new name "${newName}". Please, try again`,
      });
    });
};

const openDeleteConfirmModal = ({ items }: { items: FileExplorerItem[] }) => {
  deleteModal.value.items = items;
  deleteModal.value.isActive = true;
};

const deleteItems = async () => {
  deleteModal.value.isActive = false;

  const itemIds = deleteModal.value.items.map(({ id }) => id);

  await store.dispatch("spaces/deleteItems", {
    projectId: props.projectId,
    itemIds,
    $router,
  });
};

const { onMoveItems, onDuplicateItems } = useMovingItems({ projectId });

const { shouldShowCustomPreview, nodeTemplate, onDrag, onDragEnd } =
  useCustomDragPreview({ projectId });
</script>

<template>
  <div :class="mode" class="space-explorer">
    <SpaceExplorerBreadcrumbs
      :active-workflow-group="activeWorkflowGroup"
      @click="onChangeDirectory"
    />

    <SmartLoader
      class="smart-loader content"
      :loading="isLoadingContent"
      :config="{
        initialDimensions: { height: '76px' },
        staggerStageCount: 1,
      }"
    >
      <FileExplorer
        v-if="activeWorkflowGroup"
        aria-label="Current workflow group in Space Explorer"
        :selected-item-ids="selectedItemIds"
        :mode="mode"
        :items="fileExplorerItems"
        :is-root-folder="activeWorkflowGroup.path.length === 0"
        :full-path="fullPath"
        :active-renamed-item-id="activeRenamedItemId"
        :click-outside-exception="clickOutsideException"
        dragging-animation-mode="manual"
        @update:selected-item-ids="$emit('update:selectedItemIds', $event)"
        @change-directory="onChangeDirectory"
        @open-file="onOpenFile"
        @rename-file="onRenameFile"
        @delete-items="openDeleteConfirmModal"
        @move-items="onMoveItems"
        @drag="onDrag"
        @dragend="onDragEnd"
      >
        <template #itemIcon="{ item }">
          <Component :is="itemIconRenderer(item)" />
        </template>

        <template
          v-if="shouldShowCustomPreview && nodeTemplate"
          #customDragPreview
        >
          <NodePreview
            :type="nodeTemplate.type"
            :in-ports="nodeTemplate.inPorts"
            :out-ports="nodeTemplate.outPorts"
            :icon="nodeTemplate.icon"
          />
        </template>

        <template
          #contextMenu="{
            createRenameOption,
            createDeleteOption,
            anchor,
            onItemClick,
            isMultipleSelectionActive,
            closeContextMenu,
          }"
        >
          <SpaceExplorerContextMenu
            :create-rename-option="createRenameOption"
            :create-delete-option="createDeleteOption"
            :anchor="anchor"
            :on-item-click="onItemClick"
            :is-multiple-selection-active="isMultipleSelectionActive"
            :close-context-menu="closeContextMenu"
            :project-id="projectId"
            :selected-item-ids="selectedItemIds"
            @duplicate-items="onDuplicateItems"
          />
        </template>
      </FileExplorer>
    </SmartLoader>

    <SpaceExplorerDeleteItemModal
      :is-active="deleteModal.isActive"
      :items="deleteModal.items"
      :item-icon-renderer="itemIconRenderer"
      @accept="deleteItems()"
      @cancel="deleteModal = { isActive: false, items: [] }"
    />

    <DeploymentsModal />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.space-explorer {
  width: 100%;
}

.smart-loader {
  --smartloader-bg: var(--knime-gray-ultra-light);
  --smartloader-icon-size: 30;
  --smartloader-z-index: 2;
}
</style>
