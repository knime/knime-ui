<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "@floating-ui/vue";

import CogIcon from "@knime/styles/img/icons/cog.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type {
  ComponentLayoutRow,
  ComponentLayoutView,
} from "@/store/layoutEditor/types";

import ConfigDialog from "./ConfigDialog.vue";
import EditButton from "./EditButton.vue";
import KnimeView from "./KnimeView.vue";
import Row from "./Row.vue";

interface Props {
  item: ComponentLayoutView | ComponentLayoutRow;
}

defineProps<Props>();

const layoutEditorStore = useLayoutEditorStore();

const showConfigDialog = ref(false);
const reference = ref(null);
const floating = ref(null);
const { floatingStyles } = useFloating(reference, floating, {
  strategy: "fixed",
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
    <Row v-else-if="item.type === 'row'" :row="item as ComponentLayoutRow" />
    <div v-else-if="item.type === 'html'">HTML</div>

    <EditButton
      v-if="item.type !== 'row'"
      class="delete-button"
      title="Delete"
      @click.prevent.stop="layoutEditorStore.deleteContentItem(item)"
    >
      <TrashIcon />
    </EditButton>

    <!-- TODO: Figure out how to replace popperjs -->
    <template v-if="item.type === 'view' || item.type === 'quickform'">
      <EditButton
        ref="reference"
        :class="['config-button', { active: showConfigDialog }]"
        title="Configure size"
        @click="showConfigDialog = !showConfigDialog"
      >
        <CogIcon />
      </EditButton>

      <Teleport v-if="showConfigDialog" to="body">
        <ConfigDialog
          ref="floating"
          :item="item as ComponentLayoutView"
          :style="floatingStyles"
        />
      </Teleport>
    </template>
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
</style>
