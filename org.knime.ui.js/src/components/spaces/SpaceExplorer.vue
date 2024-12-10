<script setup lang="ts">
import { computed, onUnmounted, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";

import { FileExplorer, NodePreview } from "@knime/components";
import type { FileExplorerItem } from "@knime/components";

import {
  SpaceItem,
  type WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import SpaceExplorerContextMenu from "@/components/spaces/SpaceExplorerContextMenu.vue";
import { useStore } from "@/composables/useStore";
import { getToastPresets } from "@/toastPresets";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";
import { matchesQuery } from "@/util/matchesQuery";

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
  clickOutsideException?: HTMLElement | null;
  filterQuery?: string;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "normal",
  virtual: true,
  clickOutsideException: null,
  filterQuery: "",
});

const $emit = defineEmits<{
  changeDirectory: [pathId: string];
  "update:selectedItemIds": [selectedItemIds: string[]];
}>();

const store = useStore();
const $router = useRouter();
const { toastPresets } = getToastPresets();

const projectId = toRef(props, "projectId");

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

const fetchWorkflowGroupContent = async () => {
  if (props.projectId === null) {
    return;
  }
  // unsubscribe from previous (no effect if no subscription)
  store.dispatch("spaces/unsubscribeResourceChangedEventListener");

  await store.dispatch("spaces/fetchWorkflowGroupContent", {
    projectId: props.projectId,
  });

  // subscribe to space item identified by project id
  store.dispatch("spaces/subscribeResourceChangedEventListener", {
    projectId: props.projectId,
  });
};

onUnmounted(() => {
  store.dispatch("spaces/unsubscribeResourceChangedEventListener");
});

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

  try {
    await store.dispatch("spaces/openProject", {
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

const onRenameFile = async ({
  itemId,
  newName,
}: {
  itemId: string;
  newName: string;
}) => {
  try {
    await store.dispatch("spaces/renameItem", {
      projectId: props.projectId,
      itemId,
      newName,
    });
  } catch (error) {
    toastPresets.spaces.crud.renameItemFailed({
      error,
      newName,
    });
  }
};

const { onDeleteItems } = useDeleteItems({
  projectId: props.projectId,
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
        :virtual
        :items="filteredFileExplorerItems"
        :is-root-folder="activeWorkflowGroup.path.length === 0"
        :full-path="fullPath"
        :active-renamed-item-id="activeRenamedItemId"
        :click-outside-exception="clickOutsideException"
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
