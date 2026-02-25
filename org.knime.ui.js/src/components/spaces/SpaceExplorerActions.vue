<script setup lang="ts">
import { computed, toRefs } from "vue";
import { kebabCase } from "lodash-es";
import { storeToRefs } from "pinia";

import { FunctionButton, SubMenu } from "@knime/components";
import MenuOptionsIcon from "@knime/styles/img/icons/menu-options.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

import SearchButton from "@/components/common/SearchButton.vue";
import { useContextualSpaceExplorerActions } from "@/composables/useSpaceExplorerActions/useContextualSpaceExplorerActions";
import { useShortcuts } from "@/plugins/shortcuts";
import { getToastPresets } from "@/services/toastPresets";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import type { MenuItemWithHandler } from "../common/types";

import SpaceExplorerActionButton from "./SpaceExplorerActionButton.vue";
import SpaceExplorerFloatingButton from "./SpaceExplorerFloatingButton.vue";

type DisplayModes = "normal" | "mini";

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
const { selectedItemIds, projectId } = toRefs(props);

const emit = defineEmits<{
  "update:filterQuery": [value: string];
}>();
const $shortcuts = useShortcuts();
const { fetchWorkflowGroupContent } = useSpaceOperationsStore();
const { isLoadingContent } = storeToRefs(useSpaceOperationsStore());

const { createWorkflow, spaceExplorerActionsItems } =
  useContextualSpaceExplorerActions(projectId, selectedItemIds, {
    mode: props.mode,
  });

const reload = async () => {
  if (projectId.value) {
    try {
      await fetchWorkflowGroupContent({
        projectId: projectId.value,
        retry: false,
      });
    } catch (error) {
      getToastPresets().toastPresets.spaces.crud.fetchWorkflowGroupFailed({
        error,
      });
    }
  }
};

const createWorkflowButtonTitle = computed(() => {
  const { text, hotkeyText } = $shortcuts.get("createWorkflow");
  return `${text} (${hotkeyText})`;
});

const filteredActions = (hideItems: string[]): MenuItemWithHandler[] =>
  spaceExplorerActionsItems.value.filter(
    (item) => !hideItems.includes(item.metadata!.id!),
  );
</script>

<template>
  <div class="toolbar-buttons">
    <template v-if="mode === 'normal'">
      <div class="toolbar-actions-normal">
        <SearchButton
          :model-value="filterQuery"
          placeholder="Filter current level"
          data-test-id="space-filter-btn"
          @update:model-value="emit('update:filterQuery', $event)"
        />

        <SpaceExplorerActionButton
          v-for="action in filteredActions(['createWorkflow', 'connectToHub'])"
          :key="action.metadata?.id"
          :item="action"
          :data-test-id="`space-${kebabCase(action.metadata?.id)}-btn`"
          :disabled="action.disabled || isLoadingContent"
        />

        <SpaceExplorerFloatingButton
          :title="createWorkflowButtonTitle"
          :disabled="createWorkflow.disabled"
          @click="createWorkflow.metadata.handler()"
        />
      </div>
    </template>

    <template v-if="mode === 'mini'">
      <div class="toolbar-actions-mini">
        <SearchButton
          :model-value="filterQuery"
          placeholder="Filter current level"
          data-test-id="space-filter-btn"
          class="search-button-mini"
          @update:model-value="emit('update:filterQuery', $event)"
        />
        <FunctionButton
          class="reload-button"
          data-test-id="space-reload-btn"
          @click="reload"
        >
          <ReloadIcon />
        </FunctionButton>
        <SubMenu
          :items="filteredActions(['reload'])"
          :disabled="isLoadingContent"
          :teleport-to-body="false"
          class="more-actions"
          data-test-id="space-more-actions"
          button-title="More actions"
          @toggle.stop
          @item-click="
            (_: MouseEvent, item: MenuItemWithHandler) =>
              item.metadata?.handler?.()
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
  }

  & .toolbar-actions-mini {
    display: flex;
    gap: var(--space-4);
    position: relative;

    & .search-button-mini {
      --search-button-background: var(--sidebar-background-color);

      position: absolute;
      right: 68px;
    }

    /* Aligning text in the submenu */
    & :deep(button) {
      align-items: center;
    }
  }
}
</style>
