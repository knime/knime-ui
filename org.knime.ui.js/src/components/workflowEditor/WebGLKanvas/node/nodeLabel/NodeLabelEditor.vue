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
import { nodeSize } from "@/style/shapes";
import { getToastPresets } from "@/toastPresets";
import { isNodeMetaNode } from "@/util/nodeUtil";
import ActionBar from "../../../common/svgActionBar/ActionBar.vue";
import type { ActionButtonConfig } from "../../../types";
import FloatingHTML from "../../common/FloatingHTML.vue";
import TextEditor from "../../common/TextEditor.vue";
import { onContextMenuOutside } from "../../common/onContextMenuOutside";
import { nodeLabelText } from "../../util/textStyles";

import { getNodeLabelTopOffset } from "./getNodeLabelTopOffset";

const nodeInteractionsStore = useNodeInteractionsStore();
const { labelEditorNodeId } = storeToRefs(nodeInteractionsStore);
const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);
const { toastPresets } = getToastPresets();

const editedNode = computed(() => {
  if (!activeWorkflow.value || !labelEditorNodeId.value) {
    return undefined;
  }

  return activeWorkflow.value.nodes[labelEditorNodeId.value];
});

const onCancel = () => {
  nodeInteractionsStore.closeLabelEditor();
};

const position = computed(() => {
  if (!editedNode.value) {
    return undefined;
  }

  return {
    x: editedNode.value.position.x,
    y: editedNode.value.position.y,
  };
});

const editResult = ref("");

const onSave = async () => {
  const trimmedValue = editResult.value.trim();

  // no change
  if (trimmedValue === editedNode.value?.annotation?.text.value) {
    onCancel();
    return;
  }

  const nodeId = editedNode.value!.id;

  // rename
  try {
    await nodeInteractionsStore.renameNodeLabel({
      nodeId,
      label: trimmedValue,
    });
  } catch (error) {
    toastPresets.workflow.commands.nodeLabelEditFail({ error });
  }

  nodeInteractionsStore.closeLabelEditor();
};

const borderWidth = 1;
const nodeStateOffset = 20;

const transformOffsets = computed(() => {
  const lineHeightPX =
    nodeLabelText.baseFontSize * nodeLabelText.baseLineHeight;
  const baseYOffset =
    editedNode.value && isNodeMetaNode(editedNode.value)
      ? nodeSize + lineHeightPX
      : nodeSize + nodeStateOffset + lineHeightPX;

  const y = editedNode.value
    ? (`${
        baseYOffset + getNodeLabelTopOffset(editedNode.value!.id)
      }px` as const)
    : ("0px" as const);

  return {
    x: `calc(-50% + ${nodeSize / 2 - borderWidth}px)` as const,
    y,
  };
});

const actions: ActionButtonConfig[] = [
  {
    title: "Save",
    icon: SaveIcon,
    onClick: onSave,
    primary: true,
    testId: "node-label-editor-save",
  },
  {
    title: "Cancel",
    icon: CancelIcon,
    onClick: onCancel,
    testId: "node-label-editor-cancel",
  },
];

const textEditorWrapper = useTemplateRef("textEditorWrapper");
onClickOutside(textEditorWrapper, onSave);
onContextMenuOutside(textEditorWrapper, onSave);
</script>

<template>
  <FloatingHTML
    :active="Boolean(editedNode)"
    :canvas-position="position"
    :transform-offsets="transformOffsets"
  >
    <div ref="textEditorWrapper" class="editor-wrapper">
      <svg class="action-bar" viewBox="-24.5 -12 49 24">
        <ActionBar :actions="actions" />
      </svg>

      <TextEditor
        :width-offset="2"
        :min-width="2"
        :max-width="nodeLabelText.styles.wordWrapWidth"
        :value="editedNode?.annotation?.text.value ?? ''"
        class="label-text-editor"
        :max-length="$characterLimits.nodeLabel"
        @cancel="onCancel"
        @save="onSave"
        @update:value="editResult = $event"
      />
    </div>
  </FloatingHTML>
</template>

<style lang="postcss" scoped>
.editor-wrapper {
  position: relative;
}

.action-bar {
  position: absolute;
  width: 54px;
  height: 25px;
  top: -25px;
  left: 0;
  right: 0;
  margin: 0 auto;
}

.label-text-editor {
  margin: auto;
  font-family: "Roboto Condensed", sans-serif;
  text-align: v-bind("nodeLabelText.styles.align");
  font-weight: v-bind("nodeLabelText.styles.fontWeight");
  font-size: calc(v-bind("nodeLabelText.styles.fontSize") * 1px);
  line-height: v-bind("nodeLabelText.baseLineHeight");
  border: v-bind("`${borderWidth}px`") var(--knime-silver-sand);
  outline: 1px solid var(--knime-silver-sand);

  &:focus-within {
    border: v-bind("`${borderWidth}px`") var(--knime-stone-dark);
    outline: 1px solid var(--knime-stone-dark);
  }
}
</style>
