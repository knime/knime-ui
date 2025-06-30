<script setup lang="ts">
import { computed } from "vue";

import PlusSmallIcon from "@knime/styles/img/icons/plus-small.svg";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type {
  LayoutEditorColumn,
  LayoutEditorRowItem,
} from "@/store/layoutEditor/types/view";
import { layoutEditorGridSize } from "@/style/shapes";

import Column from "./Column.vue";
import EditButton from "./EditButton.vue";

type Props = {
  row: LayoutEditorRowItem;
  deletable?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  deletable: true,
});

const layoutEditorStore = useLayoutEditorStore();

const columns = computed(() => props.row.columns);
const canAddColumn = computed(
  () => columns.value.length < layoutEditorGridSize,
);
const gridTemplateColumns = computed(
  () => `repeat(${layoutEditorGridSize}, 1fr)`,
);

const isRowDeletable = computed(() => {
  // make sure only empty rows (= 1 empty column) can be deleted
  const isEmpty =
    columns.value.length === 1 && columns.value[0].content.length === 0;
  return props.deletable && isEmpty;
});

const isColumnDeletable = (column: LayoutEditorColumn) => {
  // make sure the only column in a row can't be deleted
  if (columns.value.length === 1) {
    return false;
  }

  // make sure only empty columns can be deleted
  return column.content.length === 0;
};
</script>

<template>
  <div class="row" :style="{ gridTemplateColumns }">
    <Column
      v-for="(column, index) in columns"
      :key="index"
      :resizable="columns.length > 1 && column != columns[columns.length - 1]"
      :deletable="isColumnDeletable(column)"
      :column="column"
    />

    <EditButton
      v-if="canAddColumn"
      class="add-column-button"
      title="Add column"
      @click.prevent.stop="layoutEditorStore.addColumn(row)"
    >
      <PlusSmallIcon />
    </EditButton>
    <EditButton
      v-if="isRowDeletable"
      title="Delete row"
      @click.prevent.stop="layoutEditorStore.deleteContentItem(row)"
    >
      <TrashIcon />
    </EditButton>
  </div>
</template>

<style lang="postcss" scoped>
.row {
  border: 4px solid var(--knime-silver-sand);
  border-radius: 3px;
  position: relative; /* needed for delete handle positioning */
  cursor: grab;
  display: grid;

  &:not(:last-of-type) {
    margin-bottom: 5px;
  }

  & .add-column-button {
    top: calc((60px / 2) - 14px / 2);
  }
}
</style>
