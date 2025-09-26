<script setup lang="ts">
import { computed, ref } from "vue";
import { autoUpdate, flip, shift, useFloating } from "@floating-ui/vue";
import { storeToRefs } from "pinia";

import InfoIcon from "@knime/styles/img/icons/circle-info.svg";
import CogIcon from "@knime/styles/img/icons/cog.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type {
  LayoutEditorItem,
  LayoutEditorNestedLayoutNode,
} from "@/store/layoutEditor/types/view";
import {
  isNestedLayoutItem,
  isRowItem,
  isViewItem,
} from "@/store/layoutEditor/types/view";
import * as layoutEditorZIndices from "../z-indices";

import ConfigDialog from "./ConfigDialog.vue";
import EditButton from "./EditButton.vue";
import HTMLView from "./HTMLView.vue";
import KnimeView from "./KnimeView.vue";
import Row from "./Row.vue";

type Props = {
  item: LayoutEditorItem;
};

const props = defineProps<Props>();

const layoutEditorStore = useLayoutEditorStore();
const { nodes } = storeToRefs(layoutEditorStore);

const itemAsView = computed(() => (isViewItem(props.item) ? props.item : null));
const showConfigDialog = ref(false);
const reference = ref(null);
const floating = ref(null);
const { floatingStyles } = useFloating(reference, floating, {
  strategy: "fixed",
  middleware: [flip(), shift()],
  placement: "bottom-start",
  whileElementsMounted: autoUpdate,
});

const showLegacyFlagDialog = ref(false);
const legacyFlagReference = ref(null);
const legacyFlagFloating = ref(null);
const { floatingStyles: legacyFlagFloatingStyles } = useFloating(
  legacyFlagReference,
  legacyFlagFloating,
  { middleware: [flip(), shift()], whileElementsMounted: autoUpdate },
);
const showLegacyModeEnabledWarning = computed(() =>
  nodes.value.some(
    (node) =>
      isNestedLayoutItem(props.item) &&
      node.nodeID === props.item.nodeID &&
      (node as LayoutEditorNestedLayoutNode).containerLegacyModeEnabled,
  ),
);

const closeDialogs = () => {
  showConfigDialog.value = false;
  showLegacyFlagDialog.value = false;
};
</script>

<template>
  <div class="item">
    <KnimeView
      v-if="isViewItem(item) || isNestedLayoutItem(item)"
      :nodes="nodes"
      :view="item"
    />
    <Row v-else-if="isRowItem(item)" :row="item" />

    <HTMLView v-else-if="item.type === 'html'" :item="item" />

    <EditButton
      v-if="item.type !== 'row'"
      class="delete-button"
      title="Delete"
      @click.prevent.stop="layoutEditorStore.deleteContentItem(item)"
    >
      <TrashIcon />
    </EditButton>

    <EditButton
      v-if="itemAsView"
      ref="reference"
      :class="['config-button', { active: showConfigDialog }]"
      title="Configure size"
      @click="showConfigDialog = !showConfigDialog"
    >
      <CogIcon />
    </EditButton>

    <ConfigDialog
      v-if="itemAsView && showConfigDialog"
      ref="floating"
      :item="itemAsView"
      :style="floatingStyles"
      @close="showConfigDialog = false"
    />

    <EditButton
      v-if="showLegacyModeEnabledWarning"
      ref="legacyFlagReference"
      title="Legacy mode is enabled for this nested component view"
      :class="['legacy-button', { active: showLegacyFlagDialog }]"
      @click="showLegacyFlagDialog = !showLegacyFlagDialog"
    >
      <InfoIcon />
    </EditButton>

    <div
      v-if="showLegacyFlagDialog"
      ref="legacyFlagFloating"
      class="legacy-info"
      :style="legacyFlagFloatingStyles"
      @close="showLegacyFlagDialog = false"
    >
      Legacy mode is enabled for this nested component view. You can change
      these settings by editing the layout within this nested component.
    </div>

    <button
      v-if="showConfigDialog || showLegacyFlagDialog"
      class="dialog-overlay"
      @click.self.stop.prevent="closeDialogs"
      @mousedown.prevent
    />
  </div>
</template>

<style lang="postcss" scoped>
.item {
  position: relative; /* needed for handle positioning */
  min-height: 20px;

  &:not(:last-of-type) {
    margin-bottom: 5px;
  }

  & .config-button {
    right: 20px;
  }

  & .legacy-button {
    left: 0;
    top: 2px;
    border: none;
    background-color: var(--knime-carrot);
    height: 13px;
    width: 13px;
    margin-left: 5px;
  }
}

.legacy-info {
  background-color: var(--knime-white);
  box-shadow: var(--shadow-elevation-2);
  cursor: default;
  padding: var(--space-8);
  width: 360px;
  z-index: v-bind("layoutEditorZIndices.legacyInfoBox");
}

/* full window overlay to prevent other actions while config dialog is open */
.dialog-overlay {
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background-color: transparent;
  position: fixed;
  inset: 0;
  z-index: v-bind("layoutEditorZIndices.columnResizeHandle");
}
</style>
