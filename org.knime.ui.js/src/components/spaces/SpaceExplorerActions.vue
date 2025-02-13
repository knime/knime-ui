<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton, type MenuItem, SubMenu } from "@knime/components";
import CloudUploadIcon from "@knime/styles/img/icons/cloud-upload.svg";
import FolderPlusIcon from "@knime/styles/img/icons/folder-plus.svg";
import MenuOptionsIcon from "@knime/styles/img/icons/menu-options.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

import { SpaceProvider as BaseSpaceProvider } from "@/api/gateway-api/generated-api";
import AddFileIcon from "@/assets/add-file.svg";
import ImportWorkflowIcon from "@/assets/import-workflow.svg";
import PlusIcon from "@/assets/plus.svg";
import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import SearchButton from "@/components/common/SearchButton.vue";
import {
  buildCopyToSpaceMenuItem,
  buildHubDownloadMenuItem,
  buildHubUploadMenuItem,
  buildMoveToSpaceMenuItem,
  buildOpenAPIDefinitionMenuItem,
} from "@/components/spaces/remoteMenuItems";
import { isBrowser } from "@/environment";
import { useShortcuts } from "@/plugins/shortcuts";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { useSpaceUploadsStore } from "@/store/spaces/uploads";
import { isLocalProvider } from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";
import { valueOrEmpty } from "@/util/valueOrEmpty";

import SpaceExplorerFloatingButton from "./SpaceExplorerFloatingButton.vue";
import type { ActionMenuItem } from "./remoteMenuItems";

type DisplayModes = "normal" | "mini";

type ItemWithExecute = MenuItem & { execute: () => any };

type Props = {
  projectId: string;
  selectedItemIds: string[];
  mode?: DisplayModes;
  filterQuery?: string;
};

const props = withDefaults(defineProps<Props>(), {
  mode: "normal",
  filterQuery: "",
});

const emit = defineEmits(["importedItemIds", "update:filterQuery"]);
const $shortcuts = useShortcuts();

const { toastPresets } = getToastPresets();

const spacesStore = useSpacesStore();
const spaceOperationsStore = useSpaceOperationsStore();
const { isLoadingContent, selectionContainsWorkflow } =
  storeToRefs(spaceOperationsStore);
const { getProviderInfoFromProjectPath } = storeToRefs(
  useSpaceProvidersStore(),
);

const isLocal = computed(() => {
  const providerInfo = getProviderInfoFromProjectPath.value(props.projectId);
  return providerInfo ? isLocalProvider(providerInfo) : false;
});

const isWorkflowSelected = computed(() =>
  selectionContainsWorkflow.value(props.projectId, props.selectedItemIds),
);

const createWorkflowAction = computed(() => ({
  id: "createWorkflow",
  text: "Create workflow",
  icon: PlusIcon,
  disabled: isLoadingContent.value,
  hidden: props.mode !== "mini",
  execute: () => {
    spacesStore.setCreateWorkflowModalConfig({
      isOpen: true,
      projectId: props.projectId,
    });
  },
}));

const reload = () => {
  if (props.projectId) {
    spaceOperationsStore.fetchWorkflowGroupContent({
      projectId: props.projectId,
    });
  }
};

const actions = computed(() => {
  const getLocalActions = () => {
    const uploadToHub = buildHubUploadMenuItem(
      props.projectId,
      props.selectedItemIds,
    );
    if (isLocal.value) {
      return [uploadToHub];
    }
    return [];
  };

  const getHubActions = () => {
    if (isLocal.value) {
      return [];
    }
    const downloadToLocalSpace = buildHubDownloadMenuItem(
      props.projectId,
      props.selectedItemIds,
    );
    const moveToSpace = buildMoveToSpaceMenuItem(
      props.projectId,
      props.selectedItemIds,
    );
    const copyToSpace = buildCopyToSpaceMenuItem(
      props.projectId,
      props.selectedItemIds,
    );
    return [downloadToLocalSpace, moveToSpace, copyToSpace];
  };

  const getServerActions = () => {
    const providerInfo = getProviderInfoFromProjectPath.value(props.projectId);
    if (
      !providerInfo ||
      providerInfo.type !== BaseSpaceProvider.TypeEnum.SERVER ||
      !isWorkflowSelected.value
    ) {
      return [];
    }
    const openAPIDefinition = buildOpenAPIDefinitionMenuItem(
      props.projectId,
      props.selectedItemIds,
    );
    return [openAPIDefinition];
  };

  return [
    ...valueOrEmpty(isBrowser, {
      id: "upload",
      text: "Upload",
      icon: CloudUploadIcon,
      execute: () => {
        useSpaceUploadsStore().startUpload();
      },
    }),
    createWorkflowAction.value,
    {
      id: "createFolder",
      text: "Create folder",
      icon: FolderPlusIcon,
      separator: true,
      execute: async () => {
        try {
          await spaceOperationsStore.createFolder({
            projectId: props.projectId,
          });
        } catch (error) {
          toastPresets.spaces.crud.createFolderFailed({ error });
        }
      },
    },
    {
      id: "importWorkflow",
      text: "Import workflow",
      icon: ImportWorkflowIcon,
      execute: async () => {
        const items: string[] | null =
          await spaceOperationsStore.importToWorkflowGroup({
            projectId: props.projectId,
            importType: "WORKFLOW",
          });
        if (items && items.length > 0) {
          emit("importedItemIds", items);
        }
      },
    },
    {
      id: "importFiles",
      text: "Add files",
      icon: AddFileIcon,
      separator: true,
      execute: async () => {
        const items: string[] | null =
          await spaceOperationsStore.importToWorkflowGroup({
            projectId: props.projectId,
            importType: "FILES",
          });
        if (items && items.length > 0) {
          emit("importedItemIds", items);
        }
      },
    },
    ...getLocalActions(),
    ...getHubActions(),
    ...getServerActions(),
    {
      id: "reload",
      text: "Reload",
      icon: ReloadIcon,
      execute: () => reload(),
    },
  ];
});

const createWorkflowButtonTitle = computed(() => {
  const { text, hotkeyText } = $shortcuts.get("createWorkflow");
  return `${text} (${hotkeyText})`;
});

const filteredActions = (hideItems: string[]) =>
  actions.value.filter((item) => !hideItems.includes(item.id));
</script>

<template>
  <div class="toolbar-buttons">
    <template v-if="mode === 'normal'">
      <div class="toolbar-actions-normal">
        <SearchButton
          :model-value="filterQuery"
          placeholder="Filter current level"
          @update:model-value="$emit('update:filterQuery', $event)"
        />
        <OptionalSubMenuActionButton
          v-for="action in filteredActions(['createWorkflow', 'connectToHub'])"
          :id="action.id"
          :key="action.id"
          :disabled="isLoadingContent"
          :item="action"
          @click="(item) => (item as ActionMenuItem).execute?.()"
        />

        <SpaceExplorerFloatingButton
          :title="createWorkflowButtonTitle"
          :disabled="createWorkflowAction.disabled"
          @click="createWorkflowAction.execute()"
        />
      </div>
    </template>

    <template v-if="mode === 'mini'">
      <div class="toolbar-actions-mini">
        <SearchButton
          :model-value="filterQuery"
          placeholder="Filter current level"
          @update:model-value="$emit('update:filterQuery', $event)"
        />
        <FunctionButton class="reload-button" @click="reload">
          <ReloadIcon />
        </FunctionButton>
        <SubMenu
          :items="filteredActions(['reload'])"
          :disabled="isLoadingContent"
          :teleport-to-body="false"
          class="more-actions"
          button-title="More actions"
          @toggle.stop
          @item-click="
            (_: MouseEvent, { execute }: ItemWithExecute) => execute()
          "
        >
          <MenuOptionsIcon class="open-icon" />
        </SubMenu>
      </div>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.toolbar-buttons {
  --z-index-common-menu-items-expanded: v-bind("$zIndices.layerExpandedMenus");

  & .toolbar-actions-normal {
    display: flex;
    position: relative;
    gap: var(--space-4);

    --theme-button-function-foreground-color-hover: var(--knime-white);
    --theme-button-function-background-color-hover: var(--knime-masala);
  }

  & .toolbar-actions-mini {
    display: flex;
    gap: var(--space-4);

    /* the position root (relative) is the .sidebar-header */

    & :deep(.search-button-input) {
      --theme-input-field-background-color-focus: var(--knime-stone-light);

      position: absolute;
      left: 0;
      right: 100px;
    }

    /* Aligning text in the submenu */
    & :deep(button) {
      align-items: center;
    }
  }
}
</style>
