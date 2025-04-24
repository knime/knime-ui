<script setup lang="ts">
import { computed, toRefs } from "vue";
import { kebabCase } from "lodash-es";
import { storeToRefs } from "pinia";

import { FunctionButton, type MenuItem, SubMenu } from "@knime/components";
import MenuOptionsIcon from "@knime/styles/img/icons/menu-options.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import SearchButton from "@/components/common/SearchButton.vue";
import {
  type ActionMenuItem,
  useContextualSpaceExplorerActions,
} from "@/composables/useSpaceExplorerActions/useContextualSpaceExplorerActions";
import { useShortcuts } from "@/plugins/shortcuts";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";

import SpaceExplorerFloatingButton from "./SpaceExplorerFloatingButton.vue";

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

const reload = () => {
  if (projectId.value) {
    fetchWorkflowGroupContent({
      projectId: projectId.value,
    });
  }
};

const createWorkflowButtonTitle = computed(() => {
  const { text, hotkeyText } = $shortcuts.get("createWorkflow");
  return `${text} (${hotkeyText})`;
});

const filteredActions = (hideItems: string[]) =>
  spaceExplorerActionsItems.value.filter(
    (item) => !hideItems.includes(item.id),
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
        <OptionalSubMenuActionButton
          v-for="action in filteredActions(['createWorkflow', 'connectToHub'])"
          :id="action.id"
          :key="action.id"
          :disabled="isLoadingContent"
          :item="action"
          :data-test-id="`space-${kebabCase(action.id)}-btn`"
          @click="(item) => (item as ActionMenuItem).execute?.()"
        />

        <SpaceExplorerFloatingButton
          :title="createWorkflowButtonTitle"
          :disabled="createWorkflow.disabled"
          @click="createWorkflow.execute()"
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
