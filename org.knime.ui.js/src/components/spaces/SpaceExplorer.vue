<script setup lang="ts">
import { type Ref, computed, ref, toRef, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { FileExplorer, NodePreview } from "@knime/components";
import type { FileExplorerItem } from "@knime/components";

import { SpaceItem } from "@/api/gateway-api/generated-api";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import SpaceExplorerContextMenu from "@/components/spaces/SpaceExplorerContextMenu.vue";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { getToastPresets } from "@/toastPresets";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";
import { matchesQuery } from "@/util/search";

import DeploymentsModal from "./DeploymentsModal/DeploymentsModal.vue";
import SpaceExplorerBreadcrumbs from "./SpaceExplorerBreadcrumbs.vue";
import { useCustomDragPreview } from "./useCustomDragPreview";
import { useDeleteItems } from "./useDeleteItems";
import { useMovingItems } from "./useMovingItems";
import { useSpaceIcons } from "./useSpaceIcons";

const { getSpaceItemIcon } = useSpaceIcons();

type FileExplorerItemWithMeta = FileExplorerItem<{ type: SpaceItem.TypeEnum }>;
const itemIconRenderer = (item: FileExplorerItem) =>
  getSpaceItemIcon((item as FileExplorerItemWithMeta).meta!.type);

interface Props {
  projectId: string;
  mode?: "normal" | "mini";
  virtual?: boolean;
  selectedItemIds: string[];
  clickOutsideExceptions?: Array<Ref<HTMLElement | null>>;
  filterQuery?: string;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "normal",
  virtual: true,
  clickOutsideExceptions: () => [],
  filterQuery: "",
});

const $emit = defineEmits<{
  changeDirectory: [pathId: string];
  "update:selectedItemIds": [selectedItemIds: string[]];
}>();

const spaceOperationsStore = useSpaceOperationsStore();
const {
  isLoadingContent: isLoadingCurrentSpaceContents,
  activeRenamedItemId,
  getOpenedWorkflowItems,
  getOpenedFolderItems,
} = storeToRefs(spaceOperationsStore);

const { fetchWorkflowGroupContent, openProject, renameItem } =
  spaceOperationsStore;

const { getWorkflowGroupContent, projectPath } = storeToRefs(
  useSpaceCachingStore(),
);
const { loadingProviderSpacesData } = storeToRefs(useSpaceProvidersStore());
const $router = useRouter();
const { toastPresets } = getToastPresets();

const projectId = toRef(props, "projectId");

const activeWorkflowGroup = computed(() =>
  getWorkflowGroupContent.value(props.projectId),
);
const openedWorkflowItems = computed(() =>
  getOpenedWorkflowItems.value(props.projectId),
);
const openedFolderItems = computed(() =>
  getOpenedFolderItems.value(props.projectId),
);

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

const filteredFileExplorerItems = computed(() => {
  return fileExplorerItems.value.filter(({ name }) =>
    matchesQuery(props.filterQuery, name),
  );
});

const fullPath = computed(() => {
  if (!activeWorkflowGroup.value) {
    return "";
  }
  const { path } = activeWorkflowGroup.value;
  return ["home"].concat(path.map(({ name }) => name)).join("/");
});

const fetchWorkflowGroupContents = async () => {
  if (props.projectId === null) {
    return;
  }

  await fetchWorkflowGroupContent({ projectId: props.projectId });
};

// spaceId and itemId (folder) are based on the projectId but might change even with the same projectId (change dir)
watch(
  computed(() => projectPath.value[props.projectId]),
  async () => {
    await fetchWorkflowGroupContents();
  },
  { immediate: true, deep: true },
);

const onChangeDirectory = (pathId: string) => {
  $emit("changeDirectory", pathId);
};

const onOpenFile = async ({ id }: FileExplorerItem) => {
  const { spaceProviderId, spaceId } = projectPath.value[props.projectId];

  try {
    await openProject({
      providerId: spaceProviderId,
      spaceId,
      itemId: id,
      // send in router, so it can be used to navigate to an already open workflow
      $router,
    });
  } catch (error) {
    consola.error("Could not open selected workflow:", error);

    toastPresets.app.openProjectFailed({ error });
  }
};

const onRenameFile = ({
  itemId,
  newName,
}: {
  itemId: string;
  newName: string;
}) => {
  renameItem({
    projectId: props.projectId,
    itemId,
    newName,
  }).catch((error: any) => {
    toastPresets.spaces.crud.renameItemFailed({
      error,
      newName,
    });
  });
};

const { onDeleteItems } = useDeleteItems({
  projectId,
  itemIconRenderer,
});

const { onMoveItems, onDuplicateItems } = useMovingItems({ projectId });

const { shouldShowCustomPreview, nodeTemplate, onDrag, onDragEnd } =
  useCustomDragPreview({ projectId });

// staggered skeleton loader
const showLoader = ref(false);

const setShowLoader = createStaggeredLoader({
  firstStageCallback: () => {
    showLoader.value = true;
  },
  resetCallback: () => {
    showLoader.value = false;
  },
});

const isLoadingContent = computed(() => {
  const currentPathInfo = projectPath.value[props.projectId];
  return (
    isLoadingCurrentSpaceContents.value ||
    loadingProviderSpacesData.value[currentPathInfo?.spaceProviderId]
  );
});

watch(isLoadingContent, () => {
  setShowLoader(isLoadingContent.value);
});
</script>

<template>
  <div :class="mode" class="space-explorer">
    <SpaceExplorerBreadcrumbs
      :active-workflow-group="activeWorkflowGroup"
      class="breadcrumb-container"
      @click="onChangeDirectory"
    />

    <SkeletonItem :loading="showLoader" height="30px" :repeat="5">
      <FileExplorer
        v-if="activeWorkflowGroup"
        aria-label="Current workflow group in Space Explorer"
        :selected-item-ids="selectedItemIds"
        :mode="mode"
        disable-options-menu
        :virtual
        :items="filteredFileExplorerItems"
        :is-root-folder="activeWorkflowGroup.path.length === 0"
        :full-path="fullPath"
        :active-renamed-item-id="activeRenamedItemId"
        :click-outside-exceptions="clickOutsideExceptions"
        dragging-animation-mode="manual"
        @update:selected-item-ids="$emit('update:selectedItemIds', $event)"
        @change-directory="onChangeDirectory"
        @open-file="onOpenFile"
        @rename-file="onRenameFile"
        @delete-items="onDeleteItems($event.items)"
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
    </SkeletonItem>

    <DeploymentsModal />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.space-explorer {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 100px;
}

.breadcrumb-container {
  max-width: 900px;
  width: 100%;
  overflow-x: auto;
  flex-shrink: 0;
}
</style>
