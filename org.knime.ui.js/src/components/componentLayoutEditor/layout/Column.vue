<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import Draggable from "vuedraggable";

import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useComponentLayoutEditorStore } from "@/store/componentLayoutEditor/componentLayoutEditor";
import type { ComponentLayoutColumn } from "@/store/componentLayoutEditor/types";

import ColumnContent from "./ColumnContent.vue";
import EditButton from "./EditButton.vue";

interface Props {
  column: ComponentLayoutColumn;
  resizable?: boolean;
  deletable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  resizable: false,
  deletable: false,
});

const componentLayoutEditorStore = useComponentLayoutEditorStore();
const { resizeColumnInfo } = storeToRefs(componentLayoutEditorStore);

const columnClasses = computed(() => ["col", `col-${props.column.widthXS}`]);

const content = computed({
  get() {
    return props.column.content;
  },
  set(newContent) {
    let changedItem = false;
    // ensure newly added nodes respect the current legacy mode settings
    newContent
      .filter((item) => item.type === "view")
      .forEach((item, itemIndex) => {
        if (
          !changedItem &&
          JSON.stringify(item) !== JSON.stringify(content.value[itemIndex])
        ) {
          changedItem = true;
        }
      });
    componentLayoutEditorStore.updateColumnContent({
      column: props.column,
      newContent,
    });
  },
});

const isCurrentColumnResizing = computed(
  () => resizeColumnInfo.value?.column === props.column,
);

const handleMove = () => {
  console.log("handleMove");
};

const handleDragStart = () => {
  componentLayoutEditorStore.setIsDragging(true);
};

const handleDragEnd = () => {
  componentLayoutEditorStore.setIsDragging(false);
};

const handleColumnDelete = () => {
  console.log("handleColumnDelete");
};

const handleColumnResizeMouseDown = () => {
  console.log("handleColumnResizeMouseDown");
};

const handleColumnResizeMouseUp = () => {
  console.log("handleColumnResizeMouseUp");
};

const handleColumnResizeMouseMove = () => {
  console.log("handleColumnResizeMouseMove");
};
</script>

<template>
  <Draggable
    v-model="content"
    :options="{ group: 'content', draggable: '.draggable' }"
    :class="[columnClasses, { resizable }]"
    item-key="itemID"
    :move="handleMove"
    @start="handleDragStart"
    @end="handleDragEnd"
  >
    <template #item="{ element, index }">
      <ColumnContent :key="index" :item="element" class="draggable" />
    </template>

    <button
      v-if="resizable"
      :class="['resizeHandle', { active: isCurrentColumnResizing }]"
      title="Drag to resize"
      @mousedown.prevent.stop="handleColumnResizeMouseDown"
    />
    <EditButton
      v-if="deletable"
      class="delete-button"
      title="Delete column"
      @click.prevent.stop="handleColumnDelete"
    >
      <TrashIcon />
    </EditButton>
    <button
      v-if="isCurrentColumnResizing"
      class="resize-overlay"
      @mouseup="handleColumnResizeMouseUp"
      @mouseout="handleColumnResizeMouseUp"
      @mousemove.stop="handleColumnResizeMouseMove"
    />
  </Draggable>
</template>

<style lang="postcss" scoped>
.col {
  --resize-width: 14px;
  --resize-line-width: 2px;
  --resize-border-width: calc(
    (var(--resize-width) - var(--resize-line-width)) / 2
  );
  --resize-color: var(--knime-silver-sand);
  --resize-color-active: var(--knime-yellow);
  --resize-arrow-width: 4px;
  --resize-arrow-height: 4px;

  background-color: var(--knime-white);
  padding: calc(var(--resize-width) / 2);
  min-height: 60px;

  & .draggable {
    cursor: move; /* for IE11 */
    cursor: grab;
  }

  /* stylelint-disable-next-line selector-class-pattern */
  & .resizeHandle {
    cursor: col-resize;
    margin: 0;
    padding: 0;
    outline: 0;
    width: var(--resize-width); /* quite thick to be easily clickable */
    height: 100%;
    background-color: var(--resize-color);
    position: absolute;
    right: calc(var(--resize-width) / 2 * -1);
    z-index: 100;
    bottom: 0;
    border-style: solid;
    border-width: 10px var(--resize-border-width) 10px
      var(--resize-border-width); /* but adding a border to reduce the line thinkness */

    border-color: var(--knime-white);

    &::before,
    &::after {
      content: "";
      width: 0;
      height: 0;
      border-style: solid;
      z-index: 1;
      display: block;
      position: absolute;
      top: calc(50% - var(--resize-arrow-height));
      pointer-events: none;
    }

    &::before {
      left: calc((var(--resize-arrow-width) * -1) - 1px);
      border-width: var(--resize-arrow-height) var(--resize-arrow-width)
        var(--resize-arrow-height) 0;
      border-color: transparent var(--resize-color) transparent transparent;
    }

    &::after {
      right: calc((var(--resize-arrow-width) * -1) - 1px);
      border-width: var(--resize-arrow-height) 0 var(--resize-arrow-height)
        var(--resize-arrow-width);
      border-color: transparent transparent transparent var(--resize-color);
    }

    &:hover,
    &.active {
      background-color: var(--resize-color-active);

      &::before {
        border-color: transparent var(--resize-color-active) transparent
          transparent;
      }

      &::after {
        border-color: transparent transparent transparent
          var(--resize-color-active);
      }
    }
  }

  /* align delete button to resize handle */
  &.resizable > .delete-button {
    right: 8px;
  }

  /* full window overlay while resizing to prevent loosing mouse events e.g. due to iframes in columns */
  & .resize-overlay {
    cursor: col-resize;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background-color: transparent;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
  }
}
</style>
