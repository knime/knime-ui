<script setup lang="ts">
import { toRefs, ref, watch, type Ref, nextTick } from 'vue';
import { directive as vClickAway } from 'vue3-click-away';

import InputField from 'webapps-common/ui/components/forms/InputField.vue';
import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';

import { SpaceItem } from '@/api/gateway-api/generated-api';
import { useWorkflowNameValidator } from '@/composables/useWorkflowNameValidator';

import FileExplorerItemBase from './FileExplorerItemBase.vue';
import type { FileExplorerItem } from './types';

interface Props {
    blacklistedNames: Array<string>;
    mode: 'mini' | 'normal';
    item: FileExplorerItem;
    isSelected: boolean;
    isDragging: boolean;
    isRenameActive: boolean;
}

const props = defineProps<Props>();

const { isRenameActive, blacklistedNames } = toRefs(props);

interface Emits {
    (e: 'dblclick', nativeEvent: MouseEvent): void;
    (e: 'click', nativeEvent: MouseEvent): void;
    (e: 'dragstart', nativeEvent: DragEvent): void;
    (e: 'dragenter', nativeEvent: DragEvent): void;
    (e: 'drag', nativeEvent: DragEvent): void;
    (e: 'dragleave', nativeEvent: DragEvent): void;
    (e: 'dragend', nativeEvent: DragEvent): void;
    (e: 'drop', nativeEvent: DragEvent): void;
    (e: 'contextmenu', nativeEvent: MouseEvent): void;
    (e: 'rename:submit', payload: { itemId: string; newName: string }): void;
    (e: 'rename:clear'): void;
}

const emit = defineEmits<Emits>();

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

const renameInput: Ref<InstanceType<typeof InputField> | null> = ref(null);
const renameValue = ref('');

const { isValid, errorMessage, cleanName } = useWorkflowNameValidator({
    blacklistedNames,
    name: renameValue
});

const setupRenameInput = async () => {
    renameValue.value = props.item.name;
    await nextTick();

    renameInput.value.focus();
};

watch(isRenameActive, async (isActive) => {
    if (isActive) {
        await setupRenameInput();
    }
});

const onRenameSubmit = (keyupEvent: KeyboardEvent, isClickAway = false) => {
    if (keyupEvent.key === 'Escape' || keyupEvent.key === 'Esc') {
        emit('rename:clear');
    }

    if ((keyupEvent.key === 'Enter' || isClickAway) && isValid.value) {
        const newName = cleanName(renameValue.value.trim());

        if (newName === '') {
            emit('rename:clear');
            return;
        }

        emit('rename:submit', { itemId: props.item.id, newName: renameValue.value });
        emit('rename:clear');
    }
};
</script>

<template>
  <FileExplorerItemBase
    class="file-explorer-item"
    :is-dragging="isDragging"
    :is-selected="isSelected"
    :class="item.type"
    :draggable="!isRenameActive"
    @dragstart="!isRenameActive && emit('dragstart', $event)"
    @dragenter="!isRenameActive && emit('dragenter', $event)"
    @dragover.prevent
    @dragleave="!isRenameActive && emit('dragleave', $event)"
    @dragend="!isRenameActive && emit('dragend', $event)"
    @drag="emit('drag', $event)"
    @click="emit('click', $event)"
    @contextmenu.prevent="!isRenameActive && emit('contextmenu', $event)"
    @drop.prevent="!isRenameActive && emit('drop', $event)"
    @dblclick="!isRenameActive && emit('dblclick', $event)"
  >
    <template #icon>
      <span
        v-if="item.isOpen"
        class="open-indicator"
      />
      <Component :is="getTypeIcon(item)" />
    </template>

    <td
      class="item-content"
      :class="{
        light: item.type !== SpaceItem.TypeEnum.WorkflowGroup,
        'rename-active': isRenameActive
      }"
      :title="item.name"
    >
      <span v-if="!isRenameActive">{{ item.name }}</span>
      <template v-else>
        <div v-click-away="($event) => onRenameSubmit($event, true)">
          <InputField
            ref="renameInput"
            v-model="renameValue"
            class="rename-input"
            :class="mode"
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
  </FileExplorerItemBase>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.file-explorer-item {
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

  &:not(.selected, .dragging, .dragging-over) .item-content {
    &.light {
      background-color: var(--knime-white);
    }
  }

  & td.rename-active {
    padding: 0;

    & .rename-input {
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
  }

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
</style>
