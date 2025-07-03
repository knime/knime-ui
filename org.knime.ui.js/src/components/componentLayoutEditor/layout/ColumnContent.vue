<script setup lang="ts">
import { computed, ref } from "vue";
import { autoUpdate, useFloating } from "@floating-ui/vue";

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

const itemAsView = computed(() => (isView(props.item) ? props.item : null));
const showConfigDialog = ref(false);
const reference = ref(null);
const floating = ref(null);
const { floatingStyles } = useFloating(reference, floating, {
  strategy: "fixed",
  whileElementsMounted: autoUpdate,
});
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

    <button
      v-if="showConfigDialog"
      class="dialog-overlay"
      @click.self.stop.prevent="showConfigDialog = false"
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
  z-index: 200;
}
</style>
