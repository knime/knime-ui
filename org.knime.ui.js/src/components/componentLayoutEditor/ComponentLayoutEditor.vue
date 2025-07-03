<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import Draggable from "vuedraggable";

import { Button } from "@knime/components";

import { API } from "@/api";
import { useApplicationStore } from "@/store/application/application";
import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";

import AvailableNodesAndElements from "./AvailableNodesAndElements.vue";
import Row from "./layout/Row.vue";

const layoutEditorStore = useLayoutEditorStore();
const { openWorkflow, layout, availableNodes } = storeToRefs(layoutEditorStore);

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

onMounted(async () => {
  const projectId = useApplicationStore().activeProjectId!;
  const workflowId = "root";
  const nodeId = openWorkflow.value?.workflowId;

  const initialLayout = JSON.parse(
    await API.componenteditor.getViewLayout({
      projectId,
      workflowId,
      nodeId,
    }),
  );

  const initialNodes = JSON.parse(
    await API.componenteditor.getViewNodes({
      projectId,
      workflowId,
      nodeId,
    }),
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
    </div>

    <div class="layout">
      <div v-if="availableNodes.length" class="alert" role="alert">
        Views not added into the layout and not disabled in Tab 'Node Usage'
        will be shown below layout. To circumvent unexpected behavior, add all
        views into the layout.
      </div>

      <Draggable
        v-model="rows"
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
</style>
