<!-- eslint-disable no-magic-numbers -->
<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { onClickOutside } from "@vueuse/core";
import { storeToRefs } from "pinia";

import CancelIcon from "@/assets/cancel.svg";
import SaveIcon from "@/assets/ok.svg";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeSize, portSize } from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import { invalidCharacters } from "../../../common/constants";
import ActionBar from "../../../common/svgActionBar/ActionBar.vue";
import type { ActionButtonConfig } from "../../../types";
import FloatingHTML from "../../common/FloatingHTML.vue";
import TextEditor from "../../common/TextEditor.vue";
import { FLOATING_HTML_ACTIONBAR_VIEWBOX } from "../../common/constants";
import { onContextMenuOutside } from "../../common/onContextMenuOutside";
import { nodeNameText } from "../../util/textStyles";

const nodeInteractionsStore = useNodeInteractionsStore();
const { nameEditorNodeId, nameEditorDimensions } = storeToRefs(
  nodeInteractionsStore,
);
const workflowStore = useWorkflowStore();
const canvasStore = useWebGLCanvasStore();
const { activeWorkflow } = storeToRefs(workflowStore);
const { toastPresets } = getToastPresets();

const editedNode = computed(() => {
  if (!activeWorkflow.value || !nameEditorNodeId.value) {
    return undefined;
  }

  return activeWorkflow.value.nodes[nameEditorNodeId.value];
});

const onCancel = () => {
  nodeInteractionsStore.closeNameEditor();
  canvasStore.focus();
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
  canvasStore.focus();
};

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
    testId: "node-name-editor-save",
  },
  {
    title: "Cancel",
    icon: CancelIcon,
    onClick: onCancel,
    testId: "node-name-editor-cancel",
  },
];

const borderWidth = 1;
const transformOffsets = computed(() => {
  const yOffset = Math.floor(
    (nodeNameText.basefontSize * nodeNameText.baseLineHeight) / 2,
  );

  return {
    x: "0px" as const,
    y: `calc(-100% - ${yOffset}px)` as const,
  };
});

const textEditorWrapper = useTemplateRef("textEditorWrapper");
onClickOutside(textEditorWrapper, onSave);
onContextMenuOutside(textEditorWrapper, onSave);
</script>

<template>
  <FloatingHTML
    :active="Boolean(editedNode)"
    :canvas-position="position"
    :dimensions="{ width: maxWidth }"
    :transform-offsets="transformOffsets"
  >
    <div ref="textEditorWrapper">
      <svg class="action-bar" :viewBox="FLOATING_HTML_ACTIONBAR_VIEWBOX">
        <ActionBar :actions="actions" />
      </svg>
      <TextEditor
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
  font-family: "Roboto Condensed", sans-serif;
  font-size: calc(v-bind("nodeNameText.basefontSize") * 1px);
  font-weight: v-bind("nodeNameText.styles.fontWeight");
  text-align: v-bind("nodeNameText.styles.align");
  line-height: v-bind("nodeNameText.baseLineHeight");
  border: v-bind("`${borderWidth}px`") solid var(--knime-silver-sand);

  &:focus-within {
    border: v-bind("`${borderWidth}px`") solid var(--knime-stone-dark);
  }
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
