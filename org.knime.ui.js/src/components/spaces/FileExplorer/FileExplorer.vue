<script>
import { mixin as clickaway } from 'vue-clickaway2';

import SubMenu from 'webapps-common/ui/components/SubMenu.vue';
import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';
import MenuOptionsIcon from 'webapps-common/ui/assets/img/icons/menu-options.svg';
import ArrowIcon from 'webapps-common/ui/assets/img/icons/arrow-back.svg';

import InputField from 'webapps-common/ui/components/forms/InputField.vue';
import * as multiSelectionService from './multiSelectionStateService';
import { createDragGhosts } from './dragGhostHelpers';
import ITEM_TYPES from '../itemTypes';

const INVALID_NAME_CHARACTERS = /[(*?#:"<>%~|/).]/;

const INVALID_TRAILING_WHITESPACES = /\s+$/;

export default {
    components: {
        SubMenu,
        MenuOptionsIcon,
        WorkflowGroupIcon,
        WorkflowIcon,
        ComponentIcon,
        DataIcon,
        MetaNodeIcon,
        ArrowIcon,
        InputField
    },

    mixins: [clickaway],

    props: {
        mode: {
            type: String,
            default: 'normal',
            validator: (value) => ['normal', 'mini'].includes(value)
        },

        isRootFolder: {
            type: Boolean,
            required: true
        },

        items: {
            type: Array,
            required: true
        },

        fullPath: {
            type: String,
            default: ''
        }
    },

    data() {
        return {
            ITEM_TYPES,
            multiSelectionState: multiSelectionService.getInitialState(),
            isDragging: false,
            startDragItemIndex: null,
            isRenamingItemId: null,
            renameValue: '',
            isRenamingInvalid: false
        };
    },

    watch: {
        fullPath() {
            this.resetSelection();
        },

        multiSelectionState() {
            const normalizedRanges = multiSelectionService.normalizeRanges(this.multiSelectionState);

            this.$emit('selection-change', normalizedRanges);
        }
    },

    methods: {
        resetSelection() {
            this.multiSelectionState = multiSelectionService.getInitialState();
        },

        isDirectory(item) {
            return item.type === ITEM_TYPES.WorkflowGroup;
        },

        canOpenFile(item) {
            return item.type === ITEM_TYPES.Workflow;
        },

        getTypeIcon(item) {
            const typeIcons = {
                [ITEM_TYPES.WorkflowGroup]: WorkflowGroupIcon,
                [ITEM_TYPES.Workflow]: WorkflowIcon,
                [ITEM_TYPES.Component]: ComponentIcon,
                [ITEM_TYPES.Metanode]: MetaNodeIcon,
                [ITEM_TYPES.Data]: DataIcon
            };

            return typeIcons[item.type];
        },

        isSelected(index) {
            return multiSelectionService.isItemSelected(this.multiSelectionState, index);
        },

        clickItem(index) {
            this.multiSelectionState = multiSelectionService.click(index);
        },

        ctrlClickItem(index) {
            this.multiSelectionState = multiSelectionService.ctrlClick(
                this.multiSelectionState,
                index
            );
        },

        shiftClickItem(index) {
            this.multiSelectionState = multiSelectionService.shiftClick(
                this.multiSelectionState,
                index
            );
        },

        changeDirectory(pathId) {
            this.$emit('change-directory', pathId);
        },

        onItemDoubleClick(item) {
            if (this.isDirectory(item)) {
                this.changeDirectory(item.id);
                return;
            }

            if (this.canOpenFile(item)) {
                this.$emit('open-file', item);
            }
        },

        onDragStart(e, index) {
            this.isDragging = true;
            this.startDragItemIndex = index;

            if (!this.isSelected(index)) {
                this.resetSelection();
                this.clickItem(index);
            }

            const isMultipleSelectionActive = multiSelectionService.isMultipleSelectionActive(
                this.multiSelectionState,
                index
            );

            // get all items that are selected, except the one that initiated the drag
            const selectedIndexes = multiSelectionService
                .getSelectedIndexes(this.multiSelectionState)
                .filter(selectedIndex => index !== selectedIndex);

            // map an index to an object that will be used to generate the ghost
            const toGhostTarget = (_index) => ({
                targetEl: this.getItemElementByRefIndex(_index),
                textContent: this.items[_index].name
            });

            const selectedTargets = []
                // add the item that initiated the drag at the beginning of the array
                .concat(toGhostTarget(index))
                .concat(selectedIndexes.map(toGhostTarget));

            const { removeGhosts } = createDragGhosts({
                dragStartEvent: e,
                badgeCount: isMultipleSelectionActive ? selectedIndexes.length + 1 : null,
                selectedTargets
            });

            this.removeGhosts = removeGhosts;
        },

        onDragEnter(index, isGoBackItem = false) {
            if (this.isSelected(index) && !isGoBackItem) {
                return;
            }

            if (index !== this.startDragItemIndex) {
                const draggedOverEl = this.getItemElementByRefIndex(index, isGoBackItem);
                draggedOverEl.classList.add('dragging-over');
            }
        },

        onDragLeave(index, isGoBackItem = false) {
            const draggedOverEl = this.getItemElementByRefIndex(index, isGoBackItem);
            draggedOverEl.classList.remove('dragging-over');
        },

        onDragEnd() {
            this.isDragging = false;
            this.removeGhosts?.();
        },

        onDrop(index, isGoBackItem = false) {
            const droppedEl = this.getItemElementByRefIndex(index, isGoBackItem);
            droppedEl.classList.remove('dragging-over');

            if (!isGoBackItem && !this.isDirectory(this.items[index])) {
                return;
            }

            const selectedIndexes = multiSelectionService.getSelectedIndexes(this.multiSelectionState);
            this.$emit('move', {
                sourceItems: selectedIndexes.map(index => this.items[index].id),
                targetItem: isGoBackItem ? '..' : this.items[index].id
            });
        },

        getItemElementByRefIndex(index, isGoBackItem = false) {
            return isGoBackItem
                ? this.$refs[`item--BACK`]
                // except for the "Go back" item, all others are present within a v-for
                // so the refs are returned in a collection, but we only need the 1st item
                : this.$refs[`item--${index}`][0];
        },

        getMenuOptions(item) {
            return [{
                id: 'rename',
                text: 'Rename',
                ...item.displayOpenIndicator
                    ? { title: 'Open workflows cannot be renamed', disabled: true }
                    : {}
            }, {
                id: 'delete',
                text: 'Delete',
                ...item.canBeDeleted
                    ? {}
                    : { title: 'Open workflows cannot be deleted', disabled: true }
            }];
        },

        onMenuClick(optionId, item) {
            if (optionId === 'delete') {
                this.$emit('delete-items', { items: [item] });
            }
            if (optionId === 'rename') {
                this.setupRenameInput(item.id, item.name);
            }
        },

        onMenuClick(option, item) {
            console.log(option);
            console.log(item);
            if (option === 'rename') {
                this.isRenamingItemId = item.id;
                this.renameValue = item.name;
                this.setupRenameInput();
            }
        },
        onRenameChange(value) {
            console.log(value);
            this.isRenamingInvalid = INVALID_NAME_CHARACTERS.test(value) || INVALID_TRAILING_WHITESPACES.test(value);
        },
        onRenameFocus() {
            console.log('rename focus');
        },
        setupRenameInput(id, name) {
            this.isRenamingItemId = id;
            this.renameValue = name;
            this.$nextTick(() => {
                this.$refs.renameRef[0].$refs.input.focus();
            
                this.$refs.renameRef[0].$refs.input.addEventListener('keyup', this.onRenameSubmit);
            });
        },
        onRenameSubmit(keyupEvent) {
            if (keyupEvent.keyCode === 13 && !this.isRenamingInvalid) {
                this.$emit('rename-file', { itemId: this.isRenamingItemId, newName: this.renameValue });
                console.log('rename submit');
                this.$refs.renameRef[0].$refs.input.removeEventListener('keyup', this.onRenameSubmit);
                this.isRenamingItemId = null;
                this.renameValue = '';
            }
        }
    }
};
</script>

<template>
  <table
    v-on-clickaway="() => resetSelection()"
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
        ref="item--BACK"
        class="file-explorer-item"
        title="Go back"
        @dragenter="onDragEnter(null, true)"
        @dragleave="onDragLeave(null, true)"
        @dragover.prevent
        @drop.prevent="onDrop(null, true)"
        @dblclick="changeDirectory('..')"
      >
        <td
          class="item-icon"
          colspan="3"
        >
          <ArrowIcon />
        </td>
        <td class="item-name hidden">
          Go back to parent directory
        </td>
      </tr>

      <tr
        v-for="(item, index) in items"
        :key="index"
        :ref="`item--${index}`"
        class="file-explorer-item"
        :class="[item.type, { selected: !isDragging && isSelected(index), dragging: isDragging && isSelected(index) }]"
        :draggable="true"
        @dragstart="onDragStart($event, index)"
        @dragenter="onDragEnter(index)"
        @dragover.prevent
        @dragleave="onDragLeave(index)"
        @dragend="onDragEnd"
        @drop.prevent="onDrop(index)"
        @click.exact="clickItem(index)"
        @click.exact.ctrl="ctrlClickItem(index)"
        @click.exact.shift="shiftClickItem(index)"
        @dblclick="onItemDoubleClick(item)"
      >
        <td class="item-icon">
          <span
            v-if="item.displayOpenIndicator"
            class="open-indicator"
          />
          <Component :is="getTypeIcon(item)" />
        </td>

        <td
          class="item-content"
          :class="{ light: item.type !== ITEM_TYPES.WorkflowGroup }"
          :title="item.name"
        >
          <span v-if="isRenamingItemId !== item.id">{{ item.name }}</span>
          <template v-else>
            <InputField
              ref="renameRef"
              v-model="renameValue"
              class="is-renamed"
              type="text"
              title="rename"
              :is-valid="!isRenamingInvalid"
              @input="onRenameChange"
            />
            <div
              v-if="isRenamingInvalid"
              class="item-error"
            >
              <span>Name contains invalid characters (*?#:"<>%~|/) or trailing spaces.</span>
            </div>
          </template>
        </td>

        <td
          class="item-option"
          @dblclick.stop
        >
          <SubMenu
            button-title="Options"
            :items="getMenuOptions(item)"
            @item-click="(e, option) => onMenuClick(option.id, item)"
          >
            <MenuOptionsIcon />
          </SubMenu>
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
  </table>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

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

  /* Prevent children from interfering with drag events */
  & td {
    & .is-renamed {
      pointer-events: auto;

      & >>> input {
        font-size: 18px;
        font-weight: 700;
      }
    }

    pointer-events: none;
  }
  
  & .item-error {
    backdrop-filter: blur(10px);
    font-weight: 300;
    position: absolute;
    color: var(--theme-color-error);
    padding: 7px 5px;
    margin-top: 5px;
  }
  
  & .item-icon,
  & .item-option {
    pointer-events: auto;
    /*
    & >>> .submenu-toggle {
       height: 100%;
      border-radius: 0;
    }
    */

    /*
     * NB: The MenuItems set the svg size to 18px x 18px
     * but this is too big here and causes misalignment
     */
    & >>> .menu-wrapper {
      & svg {
        height: 14px;
        width: 14px;
      }
    }

    & svg {
      display: flex;

      @mixin svg-icon-size var(--icon-size);

      stroke: var(--knime-masala);
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

    & >>> .submenu-toggle {
      border-radius: 0;
      display: flex;
      height: 100%;
      padding: var(--item-padding) 3px;
    }
  }
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
