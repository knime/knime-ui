<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import Draggable from "vuedraggable";

import { Button } from "@knime/components";
import InfoIcon from "@knime/styles/img/icons/circle-info.svg";

import { API } from "@/api";
import { GRID_SIZE } from "@/store/layoutEditor/const";
import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import AvailableNodesAndElements from "./AvailableNodesAndElements.vue";
import Row from "./layout/Row.vue";

const layoutEditorStore = useLayoutEditorStore();
const {
  openWorkflow,
  layout,
  availableNodes,
  isLegacyModeOutOfSync,
  isWrappingLayout,
} = storeToRefs(layoutEditorStore);

const rows = computed({
  get() {
    return layout.value.rows;
  },
  set(value) {
    layoutEditorStore.updateFirstLevelRows(value);
  },
});

const onClear = () => {
  layoutEditorStore.clearLayout();
};

const onReset = () => {
  layoutEditorStore.resetLayout();
};

const handleDragStart = () => {
  layoutEditorStore.setIsDragging(true);
};

const handleDragEnd = () => {
  layoutEditorStore.setIsDragging(false);
};

const handleLegacyModeToggle = (event: Event) => {
  const target = event.target as HTMLInputElement;
  layoutEditorStore.setUseLegacyMode(target.checked);
};

onMounted(async () => {
  if (openWorkflow.value === null) {
    consola.warn("No workflow is currently open for editing.");
    return;
  }

  const initialLayout = JSON.parse(
    await API.componenteditor.getViewLayout(openWorkflow.value),
  );

  const initialNodes = JSON.parse(
    await API.componenteditor.getViewNodes(openWorkflow.value),
  );

  layoutEditorStore.setLayout(initialLayout);
  layoutEditorStore.setNodes(initialNodes);
});
</script>

<template>
  <div class="container">
    <div class="controls">
      <Button
        compact
        with-border
        style="margin-right: 4px"
        title="remove all views and rows"
        @click="onClear"
      >
        clear layout
      </Button>
      <Button
        compact
        with-border
        title="revert to initial state"
        @click="onReset"
      >
        reset layout
      </Button>

      <AvailableNodesAndElements />

      <label title="Enable legacy styling for supported views">
        <input
          :checked="layout.parentLayoutLegacyMode"
          type="checkbox"
          @change="handleLegacyModeToggle"
        />
        Use legacy mode
      </label>
      <button
        v-if="true"
        title="Legacy mode for some view may not match this setting"
        class="legacy-info"
        disabled="true"
      >
        <InfoIcon />
      </button>
    </div>

    <div class="layout">
      <div v-if="availableNodes.length" class="alert" role="alert">
        Views not added into the layout and not disabled in Tab 'Node Usage'
        will be shown below layout. To circumvent unexpected behavior, add all
        views into the layout.
      </div>

      <div v-if="isWrappingLayout" class="alert" role="alert">
        Your layout has rows with a total column width larger than
        {{ GRID_SIZE }}, therefore the columns will wrap. The visual editor
        doesn't support wrapping layouts yet. Please use advanced editor
        instead.
      </div>

      <div v-if="isLegacyModeOutOfSync" class="alert" role="alert">
        The legacy mode setting of some views in the layout do not match parent
        layout legacy mode setting. This may have been caused by changes made in
        the advanced layout editor. If this was intentional, you can ignore this
        warning. Otherwise, toggle the "Use legacy mode" option to synchronize
        the settings.
      </div>

      <Draggable
        v-model="rows"
        force-fallback="true"
        group="content"
        class="layout-preview"
        :component-data="{ isFirstLevel: true }"
        item-key="id"
        @start="handleDragStart"
        @end="handleDragEnd"
      >
        <template #item="{ element, index }">
          <Row :key="index" :row="element" :deletable="rows.length > 1" />
        </template>
      </Draggable>
    </div>
  </div>
</template>

<style lang="postcss">
/* when dragging from available nodes/elements over layout,
  this list element will temporarily be added to the layout */
.layout-preview li.sortable-ghost {
  list-style: none;
  background-color: var(--knime-aquamarine);
  border-radius: 3px;
  margin: 5px 0;
  width: 100%;
  height: 50px;
  color: transparent;

  &.quickform,
  &.configuration {
    background-color: var(--knime-avocado);
  }

  &.row {
    border: 4px solid var(--knime-silver-sand);
    background-color: transparent;
    min-height: 68px;
  }

  & * {
    display: none; /* for now we just hide the content, maybe there is a better way to render the ghost */
  }
}
</style>

<style lang="postcss" scoped>
.container {
  background-color: var(--knime-white);
  display: flex;
}

.controls {
  background-color: var(--knime-gray-light-semi);
  height: 50vh;
  padding: var(--space-12) var(--space-12) 0 var(--space-16);
  max-width: 250px;
}

.layout {
  position: relative;
  overflow-y: auto;
  height: 50vh;
  min-height: 100px;
  padding: var(--space-12) var(--space-16) 0 var(--space-16);
  flex: 1;
}

.layout-preview {
  /* fill height to be a drag zone on first level */
  min-height: calc(100% - 50px);
  padding-bottom: 20px;
  margin-bottom: 10px;

  /* hide buttons of dragging element and it's children */
  & .sortable-drag button:not(.resize-handle) {
    visibility: hidden;
  }
}

.alert {
  color: var(--knime-carrot);
}

.legacy-info {
  border: none;
  height: 14px;
  width: 14px;
  padding: 0;
}
</style>
