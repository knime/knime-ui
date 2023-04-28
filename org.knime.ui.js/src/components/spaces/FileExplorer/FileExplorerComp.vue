<script setup lang="ts">
import { nextTick, ref, type Ref, toRefs, computed, watch } from 'vue';
import { directive as vClickAway } from 'vue3-click-away';

import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';
import ArrowIcon from 'webapps-common/ui/assets/img/icons/arrow-back.svg';
import InputField from 'webapps-common/ui/components/forms/InputField.vue';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';

import { SpaceItem, type NodeTemplate } from '@/api/gateway-api/generated-api';

import { useItemRename } from './useItemRename';
import { createDragGhosts } from './dragGhostHelpers';
import { useMultiSelection } from './useMultiSelection';
import FileExplorerContextMenu, { type ItemClickPayload } from './FileExplorerContextMenu.vue';
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

const emit = defineEmits([
    'changeSelection',
    'changeDirectory',
    'openFile',
    'deleteItems',
    'moveItems',
    'dragend',
    'renameFile',
    'drag'
]);

const isDragging = ref(false);
const startDragItemIndex = ref<number | null>(null);
const nodeTemplate = ref<NodeTemplate | null>(null);

/** MULTISELECTION */
const {
    multiSelectionState,
    handleSelectionClick,
    isSelected,
    selectedIndexes,
    isMultipleSelectionActive,
    resetSelection
} = useMultiSelection();

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
const renameInput: Ref<Array<InstanceType<typeof InputField> | null>> = ref(null);

const {
    name: renameValue,
    isValid,
    errorMessage,
    isActiveRenameItem,
    onRenameSubmit,
    setupRenameInput,
    clearRenameState
} = useItemRename({
    items: props.items,
    focusInput: async () => {
        await nextTick();

        // wait to next event loop to properly steal focus
        await new Promise(r => setTimeout(r, 0));
        renameInput.value[0].focus();
    }
});
/** RENAME */

const isDirectory = (item: FileExplorerItem) => item.type === SpaceItem.TypeEnum.WorkflowGroup;
const canOpenFile = (item: FileExplorerItem) => item.type === SpaceItem.TypeEnum.Workflow;

const getTypeIcon = (item: FileExplorerItem) => {
    const typeIcons = {
        [SpaceItem.TypeEnum.WorkflowGroup]: WorkflowGroupIcon,
        [SpaceItem.TypeEnum.Workflow]: WorkflowIcon,
        [SpaceItem.TypeEnum.Component]: ComponentIcon,
        [SpaceItem.TypeEnum.WorkflowTemplate]: MetaNodeIcon,
        [SpaceItem.TypeEnum.Data]: DataIcon
    };

    return typeIcons[item.type];
};

const changeDirectory = (pathId: string) => emit('changeDirectory', pathId);

let __removeGhosts: ReturnType<typeof createDragGhosts>['removeGhosts'] = null;
let __replaceGhostPreview: ReturnType<typeof createDragGhosts>['replaceGhostPreview'] = null;

const itemBACK = ref<HTMLElement | null>(null);
const itemRefs = ref<HTMLElement[]>([]);
const nodePreview = ref<InstanceType<typeof NodePreview> | null>(null);

const getItemElementByRefIndex = (index: number, isGoBackItem = false): HTMLElement => isGoBackItem
    ? itemBACK.value
    // except for the "Go back" item, all others are present within a v-for
    // so the refs are returned in a collection
    : itemRefs.value[index];

const onDragStart = (event: DragEvent, index: number) => {
    isDragging.value = true;
    startDragItemIndex.value = index;

    if (!isSelected(index)) {
        resetSelection();
        handleSelectionClick(index);
    }

    // get all items that are selected, except the one that initiated the drag
    const otherSelectedIndexes = selectedIndexes
        .value
        .filter(selectedIndex => index !== selectedIndex);

    // map an index to an object that will be used to generate the ghost
    const toGhostTarget = (_index: number) => ({
        targetEl: getItemElementByRefIndex(_index),
        textContent: props.items[_index].name
    });

    const selectedTargets = []
        // add the item that initiated the drag at the beginning of the array
        .concat(toGhostTarget(index))
        .concat(otherSelectedIndexes.map(toGhostTarget));

    const dragGhostHelpers = createDragGhosts({
        dragStartEvent: event,
        badgeCount: isMultipleSelectionActive(index) ? otherSelectedIndexes.length + 1 : null,
        selectedTargets
    });

    __removeGhosts = dragGhostHelpers.removeGhosts;
    __replaceGhostPreview = dragGhostHelpers.replaceGhostPreview;
};

const onDragEnter = (index: number, isGoBackItem = false) => {
    if (isSelected(index) && !isGoBackItem) {
        return;
    }

    if (index !== startDragItemIndex.value) {
        const draggedOverEl = getItemElementByRefIndex(index, isGoBackItem);
        draggedOverEl.classList.add('dragging-over');
    }
};

const onDrag = (event: DragEvent, item: FileExplorerItem) => {
    const onUpdate = async (isAboveCanvas: boolean, _nodeTemplate: NodeTemplate) => {
        nodeTemplate.value = _nodeTemplate;
        if (nodeTemplate.value) {
            await nextTick();
            const nodePreviewEl = nodePreview.value.$el;

            __replaceGhostPreview?.({
                shouldUseCustomPreview: isAboveCanvas,
                ghostPreviewEl: nodePreviewEl,
                opts: { leftOffset: 35, topOffset: 35 }
            });
        }
    };
    emit('drag', { event, item, onUpdate });
};

const onDragLeave = (index: number, isGoBackItem = false) => {
    const draggedOverEl = getItemElementByRefIndex(index, isGoBackItem);
    draggedOverEl.classList.remove('dragging-over');
};

const onDragEnd = (event: DragEvent, item: FileExplorerItem) => {
    isDragging.value = false;

    if (event.dataTransfer.dropEffect === 'none') {
        __removeGhosts?.();
        return;
    }

    const onComplete = (isSuccessfulDrop: boolean) => {
        if (isSuccessfulDrop) {
            resetSelection();
        }

        // animate ghosts back if drop was unsuccessful
        __removeGhosts?.(!isSuccessfulDrop);
        __removeGhosts = null;
    };

    emit('dragend', { event, sourceItem: item, onComplete });
};

const onDrop = (index: number, isGoBackItem = false) => {
    const droppedEl = getItemElementByRefIndex(index, isGoBackItem);
    droppedEl.classList.remove('dragging-over');

    if (!isGoBackItem && !isDirectory(props.items[index])) {
        return;
    }

    const targetItem = isGoBackItem ? '..' : props.items[index].id;

    const isTargetSelected = selectedItemIds.value.includes(targetItem);

    if (isTargetSelected) {
        return;
    }

    const onComplete = (isSuccessfulMove: boolean) => {
        if (isSuccessfulMove) {
            resetSelection();
        }

        // animate ghosts back if move was unsuccessful
        __removeGhosts?.(!isSuccessfulMove);
        __removeGhosts = null;
    };

    emit('moveItems', {
        sourceItems: selectedItemIds.value,
        targetItem,
        onComplete
    });
};

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

    const element = itemRefs.value[index];
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

    clearRenameState();

    if (isDelete) {
        emit('deleteItems', { items: selectedItems.value });
    }

    if (isRename) {
        setupRenameInput(anchorItem.id, anchorItem.name);
    }

    resetSelection();
    closeContextMenu();
};

const onItemClick = (item: FileExplorerItem, event: MouseEvent, index: number) => {
    if (!isActiveRenameItem(item)) {
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
      <tr
        v-if="!isRootFolder"
        ref="itemBACK"
        class="file-explorer-item file-explorer-back-item"
        title="Go back"
        @dragenter="onDragEnter(null, true)"
        @dragleave="onDragLeave(null, true)"
        @dragover.prevent
        @drop.prevent="onDrop(null, true)"
        @click="changeDirectory('..')"
      >
        <td
          class="item-icon"
          colspan="3"
        >
          <ArrowIcon
            class="arrow-icon"
          />
        </td>
        <td class="item-name hidden">
          Go back to parent directory
        </td>
      </tr>
      <tr
        v-for="(item, index) in items"
        :key="index"
        ref="itemRefs"
        class="file-explorer-item"
        :class="[item.type, { selected: !isDragging && isSelected(index), dragging: isDragging && isSelected(index) }]"
        :draggable="!isActiveRenameItem(item)"
        @dragstart="!isActiveRenameItem(item) && onDragStart($event, index)"
        @dragenter="!isActiveRenameItem(item) && onDragEnter(index)"
        @dragover.prevent
        @dragleave="!isActiveRenameItem(item) && onDragLeave(index)"
        @dragend="!isActiveRenameItem(item) && onDragEnd($event, item)"
        @drag="onDrag($event, item)"
        @click="onItemClick(item, $event, index)"
        @contextmenu.prevent="openContextMenu($event, item, index)"
        @drop.prevent="!isActiveRenameItem(item) && onDrop(index)"
        @dblclick="!isActiveRenameItem(item) && onItemDoubleClick(item)"
      >
        <td class="item-icon">
          <span
            v-if="item.isOpen"
            class="open-indicator"
          />
          <Component :is="getTypeIcon(item)" />
        </td>

        <td
          class="item-content"
          :class="{
            light: item.type !== SpaceItem.TypeEnum.WorkflowGroup,
            'is-renamed': isActiveRenameItem(item)
          }"
          :title="item.name"
        >
          <span v-if="!isActiveRenameItem(item)">{{ item.name }}</span>
          <template v-else>
            <div v-click-away="($event) => onRenameSubmit($event, true)">
              <InputField
                ref="renameInput"
                v-model="renameValue"
                :class="['is-renamed', mode]"
                type="text"
                title="rename"
                :is-valid="isValid"
                @keyup="onRenameSubmit($event)"
              />
              <div
                v-if="!isValid"
                class="item-error"
              >
                <span>{{ errorMessage }}</span>
              </div>
            </div>
          </template>
        </td>
      </tr>

      <tr
        v-if="items.length === 0"
        class="empty"
      >
        <td>
          Folder is empty
        </td>
      </tr>
    </tbody>
    <NodePreview
      v-if="nodeTemplate"
      v-show="false"
      ref="nodePreview"
      class="node-preview"
      :type="nodeTemplate.type"
      :in-ports="nodeTemplate.inPorts"
      :out-ports="nodeTemplate.outPorts"
      :icon="nodeTemplate.icon"
    />

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
          name="context-menu"
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
@import url("@/assets/mixins.css");

.hidden {
  display: none;
}

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

.file-explorer-item {
  --icon-size: 20;
  --item-padding: 8px;
  --selection-color: hsl(206deg 74% 90%/100%);

  user-select: none;
  background: var(--knime-gray-ultra-light);
  transition: box-shadow 0.15s;
  display: flex;
  flex-flow: row nowrap;
  width: 100%;
  margin-bottom: 2px;
  align-items: center;
  /* position: relative; */

  /* add transparent border to prevent jumping when the dragging-over styles add a border */
  border: 1px solid transparent;

  &:hover {
    box-shadow: 0 1px 5px 0 var(--knime-gray-dark-semi);
  }

  &.selected {
    background: var(--selection-color);
  }

  &.dragging {
    background: var(--selection-color);
    color: var(--knime-masala);
  }

  &.dragging-over {
    background: var(--knime-porcelain);
    border: 1px solid var(--knime-dove-gray);
  }

  & .item-content {
    width: 100%;
    height: 100%;
    flex: 2 1 auto;
    color: var(--knime-masala);
    padding: var(--item-padding);
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  &:not(.selected, .dragging, .dragging-over) .item-content {
    &.light {
      background-color: var(--knime-white);
    }
  }

  & td.is-renamed {
    padding: 0;
  }

  & td {
    & .is-renamed {
      pointer-events: auto;
      height: 30px;
      padding: 0;

      & :deep(input) {
        font-size: 18px;
        font-weight: 700;
        padding: 0 7px 1px;
      }

      &.mini :deep(input) {
        font-size: 16px;
        font-weight: 400;
      }
    }

    /* Prevent children from interfering with drag events */
    pointer-events: none;
  }

  & .item-error {
    font-size: 13px;
    line-height: 1.5;
    backdrop-filter: blur(10px);
    font-weight: 300;
    position: absolute;
    color: var(--theme-color-error);
    padding: 7px 5px;
    margin-top: 5px;
    white-space: normal;
  }

  & .item-icon,
  & .item-option {
    pointer-events: auto;

    & svg {
      display: flex;

      @mixin svg-icon-size var(--icon-size);

      stroke: var(--knime-masala);
    }

    /*
     * The MenuItems set the svg size to 18px x 18px
     * but this is too big here and causes misalignment
     */
    & :deep(.menu-wrapper) {
      & svg {
        @mixin svg-icon-size 14px;
      }
    }
  }

  & .item-icon {
    padding: var(--item-padding);
    position: relative;

    & .open-indicator {
      position: absolute;
      width: 10px;
      height: 10px;
      background: var(--knime-dove-gray);
      border-radius: 50%;
      bottom: 4px;
      right: 4px;
    }
  }

  & .item-option {
    width: 25px;
    pointer-events: auto;
    padding: 0;
    display: flex;

    & .submenu-toggle.active > svg {
      stroke: var(--theme-button-function-foreground-color-active);
    }

    & :deep(.submenu-toggle) {
      border-radius: 0;
      display: flex;
      height: 100%;
      padding: var(--item-padding) 3px;
    }
  }

  &.file-explorer-back-item {
    cursor: pointer;

    & > .item-icon {
      & > .arrow-icon {
        stroke: var(--knime-dove-gray);
      }
    }

    &:hover {
      & > .item-icon {
        & > .arrow-icon {
          stroke: var(--knime-masala);
        }
      }
    }
  }
}

.node-preview {
  position: fixed;
  height: 70px;
  width: 70px;
  pointer-events: none;
  z-index: 9;
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
</style>
