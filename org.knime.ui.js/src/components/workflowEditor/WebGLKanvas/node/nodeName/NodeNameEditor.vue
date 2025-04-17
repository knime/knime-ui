<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { onClickOutside } from "@vueuse/core";
import { storeToRefs } from "pinia";

import CancelIcon from "@/assets/cancel.svg";
import SaveIcon from "@/assets/ok.svg";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeNameMargin, nodeSize, portSize } from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import { invalidCharacters } from "../../../common/constants";
import ActionBar from "../../../common/svgActionBar/ActionBar.vue";
import type { ActionButtonConfig } from "../../../types";
import FloatingHTML from "../../common/FloatingHTML.vue";
import TextEditor from "../../common/TextEditor.vue";
import { nodeNameText } from "../../util/textStyles";

const nodeInteractionsStore = useNodeInteractionsStore();
const { nameEditorNodeId, nameEditorDimensions } = storeToRefs(
  nodeInteractionsStore,
);
const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);
const { toastPresets } = getToastPresets();

const editedNode = computed(() => {
  if (!activeWorkflow.value || !nameEditorNodeId.value) {
    return undefined;
  }

  return activeWorkflow.value.nodes[nameEditorNodeId.value];
});

const textEditor =
  useTemplateRef<InstanceType<typeof TextEditor>>("textEditor");

const onCancel = () => {
  nodeInteractionsStore.closeNameEditor();
};

const nodeName = computed(() =>
  editedNode.value
    ? nodeInteractionsStore.getNodeName(editedNode.value.id)
    : undefined,
);

const maxWidth = (nodeNameText.styles.wordWrapWidth ?? 0) - 5;
const namePadding = nodeNameText.styles.padding ?? 0;
const borderOffset = 1;

const position = computed(() => {
  if (!editedNode.value) {
    return undefined;
  }

  const offsetY = namePadding + borderOffset / 2;

  return {
    x: editedNode.value.position.x - (maxWidth - nodeSize) / 2 + borderOffset,
    y: editedNode.value.position.y - portSize / 2 + offsetY,
  };
});

const editResult = ref("");

const onSave = async () => {
  const trimmedValue = editResult.value.trim();

  // reset to old value on empty edits
  if (trimmedValue === "") {
    onCancel();
    return;
  }

  // no change
  if (trimmedValue === nodeName.value) {
    onCancel();
    return;
  }

  const nodeId = editedNode.value!.id;

  try {
    // rename
    await nodeInteractionsStore.renameContainerNode({
      nodeId,
      name: trimmedValue,
    });
  } catch (error) {
    toastPresets.workflow.commands.nodeNameEditFail({ error });
  }

  nodeInteractionsStore.closeNameEditor();
};

const padding = nodeNameText.styles.padding ?? 0;
const yOffset = nodeNameMargin + padding - 3.5;

const positionStyle = computed(() => ({
  transform: `translateX(-1px) translateY(calc(-100% - ${yOffset}px))`,
  transformOrigin: "bottom",
}));

const hideInvalidCharsTimeoutId = ref<number>();
const onInvalidInput = () => {
  if (hideInvalidCharsTimeoutId.value) {
    clearTimeout(hideInvalidCharsTimeoutId.value);
  }
  hideInvalidCharsTimeoutId.value = window.setTimeout(() => {
    hideInvalidCharsTimeoutId.value = undefined;
  }, invalidCharacters.errorVisibleTimeMs);
};

const actions: ActionButtonConfig[] = [
  {
    title: "Save",
    icon: SaveIcon,
    onClick: onSave,
    primary: true,
  },
  {
    title: "Cancel",
    icon: CancelIcon,
    onClick: onCancel,
  },
];

// @ts-expect-error seems to be typed wrong a component is possible to pass
onClickOutside(textEditor, () => {
  onSave();
});
</script>

<template>
  <FloatingHTML
    :active="Boolean(editedNode)"
    :canvas-position="position"
    :dimensions="{ width: maxWidth }"
  >
    <div :style="positionStyle">
      <svg class="action-bar">
        <ActionBar
          transform="scale(0.95) translate(31, 10)"
          :actions="actions"
        />
      </svg>
      <TextEditor
        ref="textEditor"
        :value="nodeName"
        :width-offset="2"
        class="name-text-editor"
        :min-width="$shapes.nodeNameEditorMinWidth"
        :max-width="maxWidth"
        :invalid-characters="invalidCharacters.regexp"
        :max-length="$characterLimits.nodeName"
        save-on-enter
        @text-dimension-change="nameEditorDimensions = $event"
        @cancel="onCancel"
        @save="onSave"
        @update:value="editResult = $event"
        @invalid-input="onInvalidInput"
      />
    </div>
    <div v-if="Boolean(hideInvalidCharsTimeoutId)" class="invalid-chars-error">
      Characters
      <span class="chars">{{ invalidCharacters.regexp.source }}</span> are not
      allowed and have been removed.
    </div>
  </FloatingHTML>
</template>

<style lang="postcss" scoped>
.action-bar {
  position: absolute;
  top: -25px;
  left: 14px;
  overflow: hidden;
  width: 54px;
  height: 25px;
}

.name-text-editor {
  margin: auto;
  text-align: center;
}

.invalid-chars-error {
  position: absolute;
  top: -3px;
  left: -5%;
  width: 110%;
  border-radius: v-bind("$shapes.selectedItemBorderRadius");
  font-family: "Roboto Condensed", sans-serif;
  font-size: 10px;
  backdrop-filter: blur(5px);
  padding: var(--space-4);
  color: v-bind("$colors.error");
  text-align: center;

  & .chars {
    font-family: "Roboto Mono", sans-serif;
  }
}
</style>
