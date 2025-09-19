<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import Draggable from "vuedraggable";

import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import {
  type LayoutEditorColumn,
  type LayoutEditorItem,
} from "@/store/layoutEditor/types/view";
import { checkMove } from "@/store/layoutEditor/utils";
import { layoutEditorGridSize } from "@/style/shapes";
import * as layoutEditorZIndices from "../z-indices";

import ColumnContent from "./ColumnContent.vue";
import EditButton from "./EditButton.vue";

type Props = {
  column: LayoutEditorColumn;
  resizable?: boolean;
  deletable?: boolean;
  isRootColumn?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  resizable: false,
  deletable: false,
  isRootColumn: false,
});

const layoutEditorStore = useLayoutEditorStore();
const { resizeColumnInfo } = storeToRefs(layoutEditorStore);

const onUpdateContent = (newContent: LayoutEditorItem[]) => {
  layoutEditorStore.updateColumnContent({ column: props.column, newContent });
};

const isCurrentColumnResizing = computed(
  () => resizeColumnInfo.value?.column === props.column,
);

const handleColumnResizeMouseDown = (event: MouseEvent) => {
  const parentNode = (event.target as HTMLElement).parentNode?.parentNode;
  const containerWidth = (parentNode as HTMLElement).offsetWidth;
  layoutEditorStore.setResizeColumnInfo({
    column: props.column,
    clientX: event.clientX,
    gridStepWidth: containerWidth / layoutEditorGridSize,
    originalWidthXS: props.column.widthXS,
  });
};

const handleColumnResizeMouseMove = (event: MouseEvent) => {
  if (resizeColumnInfo.value) {
    const moveDelta = event.clientX - resizeColumnInfo.value.clientX;
    const gridDelta = Math.round(
      moveDelta / resizeColumnInfo.value.gridStepWidth,
    );
    let newWidth = resizeColumnInfo.value.originalWidthXS + gridDelta;
    layoutEditorStore.resizeColumn(newWidth);
  }
};
</script>

<template>
  <Draggable
    :model-value="column.content"
    group="content"
    draggable=".draggable"
    filter=".config-dialog, .dialog-overlay, .legacy-info, .edit-button"
    :prevent-on-filter="false"
    :class="['column', { resizable }]"
    :style="{ gridColumn: `span ${column.widthXS}` }"
    item-key="itemID"
    :move="checkMove"
    :force-fallback="true"
    :fallback-on-body="true"
    :swap-threshold="isRootColumn ? 0.15 : 1"
    :empty-insert-threshold="isRootColumn ? 5 : 20"
    @update:model-value="onUpdateContent"
    @start="layoutEditorStore.setIsDragging(true)"
    @end="layoutEditorStore.setIsDragging(false)"
  >
    <template #item="{ element, index }">
      <ColumnContent :key="index" :item="element" class="draggable" />
    </template>

    <template #header>
      <button
        v-if="resizable"
        :class="['resize-handle', { active: isCurrentColumnResizing }]"
        title="Drag to resize"
        @mousedown.prevent.stop="handleColumnResizeMouseDown"
        @pointerdown.stop
      />
      <EditButton
        v-if="deletable"
        class="delete-button"
        title="Delete column"
        @click.prevent.stop="layoutEditorStore.deleteColumn(column)"
      >
        <TrashIcon />
      </EditButton>
      <button
        v-if="isCurrentColumnResizing"
        class="resize-overlay"
        @mouseup="layoutEditorStore.setResizeColumnInfo(null)"
        @mouseout="layoutEditorStore.setResizeColumnInfo(null)"
        @mousemove.stop="handleColumnResizeMouseMove"
      />
    </template>
  </Draggable>
</template>

<style lang="postcss" scoped>
.column {
  --resize-width: 14px;
  --resize-line-width: 2px;
  --resize-border-width: calc(
    (var(--resize-width) - var(--resize-line-width)) / 2
  );
  --resize-color: var(--knime-silver-sand);
  --resize-color-active: var(--knime-masala);
  --resize-arrow-width: var(--space-4);
  --resize-arrow-height: var(--space-4);

  background-color: var(--knime-white);
  padding: calc(var(--resize-width) / 2);
  min-height: 100px;
  position: relative;

  & .resize-handle {
    cursor: col-resize;
    margin: 0;
    padding: 0;
    outline: 0;
    width: var(--resize-width); /* quite thick to be easily clickable */
    height: 100%;
    background-color: var(--resize-color);
    position: absolute;
    right: calc(var(--resize-width) / 2 * -1);
    z-index: v-bind("layoutEditorZIndices.columnResizeHandle");
    bottom: 0;
    border-style: solid;
    border-width: 10px var(--resize-border-width) 10px
      var(--resize-border-width); /* but adding a border to reduce the line thickness */

    border-color: var(--knime-white);

    &::before,
    &::after {
      content: "";
      width: 0;
      height: 0;
      border-style: solid;
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
    right: var(--space-8);
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
    z-index: v-bind("layoutEditorZIndices.columnResizeOverlay");
  }
}
</style>
