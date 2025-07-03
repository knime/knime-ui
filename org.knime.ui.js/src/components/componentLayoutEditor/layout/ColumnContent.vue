<script setup lang="ts">
import { computed, ref } from "vue";
import { useFloating } from "@floating-ui/vue";
import { storeToRefs } from "pinia";

import InfoIcon from "@knime/styles/img/icons/circle-info.svg";
import CogIcon from "@knime/styles/img/icons/cog.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type {
  ComponentLayoutRow,
  ComponentLayoutView,
} from "@/store/layoutEditor/types";
import { isRow, isView } from "@/store/layoutEditor/utils";

import ConfigDialog from "./ConfigDialog.vue";
import EditButton from "./EditButton.vue";
import KnimeView from "./KnimeView.vue";
import Row from "./Row.vue";

interface Props {
  item: ComponentLayoutView | ComponentLayoutRow;
}

const props = defineProps<Props>();

const layoutEditorStore = useLayoutEditorStore();
const { nodes } = storeToRefs(layoutEditorStore);

const itemAsView = computed(() => (isView(props.item) ? props.item : null));
const showConfigDialog = ref(false);
const reference = ref(null);
const floating = ref(null);
const { floatingStyles } = useFloating(reference, floating, {
  strategy: "fixed",
});

const showLegacyFlagDialog = ref(false);
const legacyFlagReference = ref(null);
const legacyFlagFloating = ref(null);
const { floatingStyles: legacyFlagFloatingStyles } = useFloating(
  legacyFlagReference,
  legacyFlagFloating,
  { strategy: "fixed" },
);
const componentLegacyModeEnabled = computed(() =>
  nodes.value.some(
    (node) =>
      // TODO: Add type for nestedLayout (and quickform?)
      node.nodeID === props.item.nodeID && node.containerLegacyModeEnabled,
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
      v-if="
        item.type === 'view' ||
        item.type === 'nestedLayout' ||
        item.type === 'quickform'
      "
      :view="item"
    />
    <Row v-else-if="isRow(item)" :row="item" />
    <div v-else-if="item.type === 'html'">HTML</div>

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
    />

    <EditButton
      v-if="item.type === 'nestedLayout' && componentLegacyModeEnabled"
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

  & .delete-button {
    border-radius: 0 3px 0 0;
  }

  & .config-button {
    right: 20px;
  }

  & .legacy-button {
    left: 0;
    top: 2px;
    border: none;
    height: 13px;
    width: 13px;
    margin-left: 5px;
  }
}

.legacy-info {
  background-color: var(--knime-white);
  box-shadow: var(--shadow-elevation-2);
  padding: var(--space-8);
  width: 360px;
  z-index: 100;
}

/* full window overlay to prevent other actions while popover is open */
.dialog-overlay {
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background-color: transparent;
  position: fixed;
  inset: 0;
  z-index: 99;
}
</style>
