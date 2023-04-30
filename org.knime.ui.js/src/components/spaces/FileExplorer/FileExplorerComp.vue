<script setup lang="ts">
import { ref, toRefs, computed, watch } from 'vue';
import { directive as vClickAway } from 'vue3-click-away';

import { SpaceItem } from '@/api/gateway-api/generated-api';

import { useItemDragging } from './useItemDragging';
import { useMultiSelection } from './useMultiSelection';
import FileExplorerContextMenu, { type ItemClickPayload } from './FileExplorerContextMenu.vue';
import FileExplorerItemComponent from './FileExplorerItem.vue';
import FileExplorerItemBack from './FileExplorerItemBack.vue';
import type { FileExplorerItem } from './types';

/**
 * Component that handles FileExplorer interactions.
 *
 * NOTE: Do not add store bindings to component to keep it as reusable as possible
 */
interface Props {
    mode?: 'normal' | 'mini';
    fullPath?: string;
    isRootFolder: boolean;
    items: Array<FileExplorerItem>;
}

const props = withDefaults(defineProps<Props>(), {
    mode: 'normal',
    fullPath: ''
});

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
    (e: 'changeSelection', selectedItemIds: Array<string>): void
    (e: 'changeDirectory', pathId: string): void
    (e: 'openFile', item: FileExplorerItem): void
    (e: 'deleteItems', payload: { items: Array<FileExplorerItem> }): void
    (e: 'moveItems', payload: {
      sourceItems: Array<string>;
      targetItem: string;
      onComplete: (isSuccessfulMove: boolean) => void;
    }): void
    (e: 'dragend', payload: {
      event: DragEvent;
      sourceItem: FileExplorerItem;
      onComplete: (isSuccessfulMove: boolean) => void;
    }): void
    (e: 'drag', payload: { event: DragEvent; item: FileExplorerItem }): void;
    (e: 'renameFile', payload: { itemId: string; newName: string }): void;
}>();

const isDirectory = (item: FileExplorerItem) => item.type === SpaceItem.TypeEnum.WorkflowGroup;
const canOpenFile = (item: FileExplorerItem) => item.type === SpaceItem.TypeEnum.Workflow;

const changeDirectory = (pathId: string) => emit('changeDirectory', pathId);

/** MULTISELECTION */
const multiSelection = useMultiSelection();
const {
    multiSelectionState,
    handleSelectionClick,
    isSelected,
    selectedIndexes,
    isMultipleSelectionActive,
    resetSelection
} = multiSelection;

const selectedItems = computed(() => selectedIndexes.value.map(index => props.items[index]));
const selectedItemIds = computed(() => selectedItems.value.map(item => item.id));

watch(multiSelectionState, () => {
    emit('changeSelection', selectedItemIds.value);
});

const { fullPath } = toRefs(props);
watch(fullPath, () => {
    resetSelection();
});
/** MULTISELECTION */


/** RENAME */
const activeRenameItemId = ref<string | null>(null);
const blacklistedNames = computed(
    () => props
        .items
        .filter(item => item.id !== activeRenameItemId.value)
        .map(({ name }) => name)
);
/** RENAME */


/** DRAGGING */
const itemBACK = ref<{ $el: HTMLElement } | null>(null);
const itemRefs = ref<{ $el: HTMLElement }[]>([]);
const customPreviewContainer = ref<HTMLElement | null>(null);
const customDragPreviewPlaceholder = ref<HTMLElement | null>(null);

const {
    isDragging,
    onDragStart,
    onDragEnter,
    onDrag,
    onDragLeave,
    onDragEnd,
    onDrop
} = useItemDragging({
    itemBACK: computed(() => itemBACK.value ? itemBACK.value.$el : null),
    itemRefs: computed(() => itemRefs.value ? itemRefs.value.map(({ $el }) => $el) : null),
    isDirectory,
    items: toRefs(props).items,
    multiSelection,
    // when default slot element (customDragPreviewPlaceholder ref) is not present, then
    // it means the slot has an element inside, so we should use a custom preview
    shouldUseCustomDragPreview: computed(() => !customDragPreviewPlaceholder.value),
    // we then can obtain the element by using the container
    getCustomPreviewEl: () => document.querySelector('.custom-preview') as HTMLElement
});

// eslint-disable-next-line valid-jsdoc
/**
 * This helper simply forwards the emission of the given event name, provided the payload is not null.
 * It's needed because the `useItemDragging` composable doesn't have access to the component emits
 */
const forwardEmit = (eventName: any, eventPayload: any) => {
    if (!eventPayload) {
        return;
    }

    emit(eventName, eventPayload);
};
/** DRAGGING */

const isContextMenuVisible = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });
const contextMenuAnchor = ref<{
  item: FileExplorerItem;
  index: number;
  element: HTMLElement;
} | null>(null);

const closeContextMenu = () => {
    isContextMenuVisible.value = false;
    contextMenuAnchor.value = null;
};

const openContextMenu = (event: MouseEvent, clickedItem: FileExplorerItem, index: number) => {
    if (isContextMenuVisible.value) {
        closeContextMenu();
        return;
    }

    const element = itemRefs.value[index].$el;
    contextMenuPos.value.x = event.clientX;
    contextMenuPos.value.y = event.clientY;
    contextMenuAnchor.value = { item: clickedItem, index, element };

    if (!isSelected(index)) {
        handleSelectionClick(index);
    }

    isContextMenuVisible.value = true;
};

const onContextMenuItemClick = (payload: ItemClickPayload) => {
    const { isDelete, isRename, anchorItem } = payload;

    if (isDelete) {
        emit('deleteItems', { items: selectedItems.value });
    }

    if (isRename) {
        activeRenameItemId.value = anchorItem.id;
    }

    resetSelection();
    closeContextMenu();
};

const onItemClick = (item: FileExplorerItem, event: MouseEvent, index: number) => {
    if (activeRenameItemId.value !== item.id) {
        handleSelectionClick(index, event);
    }

    closeContextMenu();
};

const onItemDoubleClick = (item: FileExplorerItem) => {
    if (isDirectory(item)) {
        changeDirectory(item.id);
        return;
    }

    if (canOpenFile(item)) {
        emit('openFile', item);
    }
};
</script>

<template>
  <table
    v-click-away="() => resetSelection()"
    aria-label="Current workflow group in Space Explorer"
  >
    <thead>
      <tr>
        <th scope="col">Type</th>
        <th
          class="name"
          scope="col"
        >
          Name
        </th>
      </tr>
    </thead>
    <tbody :class="mode">
      <FileExplorerItemBack
        v-if="!isRootFolder"
        ref="itemBACK"
        :is-dragging="isDragging"
        @dragenter="onDragEnter(null, true)"
        @dragleave="onDragLeave(null, true)"
        @dragover.prevent
        @drop.prevent="forwardEmit('moveItems', onDrop(null, true))"
        @click="changeDirectory('..')"
      />

      <FileExplorerItemComponent
        v-for="(item, index) in items"
        :key="index"
        ref="itemRefs"
        :mode="mode"
        :item="item"
        :is-dragging="isDragging"
        :is-selected="isSelected(index)"
        :is-rename-active="item.id === activeRenameItemId"
        :blacklisted-names="blacklistedNames"
        @dragstart="onDragStart($event, index)"
        @dragenter="onDragEnter(index)"
        @dragleave="onDragLeave(index)"
        @dragend="forwardEmit('dragend', onDragEnd($event, item))"
        @drag="forwardEmit('drag', onDrag($event, item))"
        @click="onItemClick(item, $event, index)"
        @contextmenu="openContextMenu($event, item, index)"
        @drop="forwardEmit('moveItems', onDrop(index))"
        @dblclick="onItemDoubleClick(item)"
        @rename:submit="emit('renameFile', $event)"
        @rename:clear="activeRenameItemId = null"
      />

      <tr
        v-if="items.length === 0"
        class="empty"
      >
        <td>
          Folder is empty
        </td>
      </tr>
    </tbody>

    <div
      ref="customPreviewContainer"
      class="custom-preview"
    >
      <slot name="customDragPreview">
        <div ref="customDragPreviewPlaceholder" />
      </slot>
    </div>

    <FileExplorerContextMenu
      v-if="isContextMenuVisible"
      :position="contextMenuPos"
      :anchor="contextMenuAnchor"
      :is-multiple-selection-active="isMultipleSelectionActive(contextMenuAnchor.index)"
      @item-click="onContextMenuItemClick"
      @close="closeContextMenu"
    >
      <template #default="slotProps">
        <slot
          name="contextMenu"
          :is-context-menu-visible="isContextMenuVisible"
          :position="contextMenuPos"
          :anchor-item="contextMenuAnchor"
          v-bind="slotProps"
        />
      </template>
    </FileExplorerContextMenu>
  </table>
</template>

<style lang="postcss" scoped>
thead {
  /* Hide table head for better readability but keeping it for a11y reasons */
  position: absolute;
  height: 1px;
  width: 1px;
  overflow: hidden;
  white-space: nowrap; /* added line */
}

table,
thead,
tbody {
  display: block;
  width: 100%;
  border-spacing: 0;
}

tbody {
  font-weight: 700;
  font-size: 18px;
}

tbody.mini {
  font-weight: 400;
  font-size: 16px;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-silver-sand);
  height: 76px;
}

tbody:not(.mini) .empty {
  background: var(--knime-gray-ultra-light);
}

.custom-preview {
  position: fixed;
  top: 0;
  left: 0;
  height: 70px;
  width: 70px;
  pointer-events: none;
  z-index: 9;
}
</style>
