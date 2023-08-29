<script setup lang="ts">
import { computed, ref } from "vue";

import { Table } from "@knime/knime-ui-table";
import {
  defaultColumns,
  defaultSortColumn,
  defaultSortDirection,
  jobHeaders,
  jobTypes,
  jobFormatters,
  popoverRenderers,
  slottedColumns,
  jobSubMenuItems,
} from "./schedulestable.config";

const defaultAttributes = {
  showSorting: true,
  showTimeFilter: true,
  showSearch: true,
  showColumnFilters: true,
  showBottomControls: true,
  showPopovers: true,
};

const props = defineProps({
  selectedItemSchedules: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const columnTypes = ref(jobTypes);
const columnFormatters = ref(jobFormatters());
const timeFilterColumn = ref("createdAt");
const slottedColumnConfig = ref(slottedColumns);
const columnHeaders = ref(Object.values(jobHeaders));
const columnKeys = ref(Object.keys(jobHeaders));

const tableAttributes = computed(() => defaultAttributes);
const subMenuItems = computed(() => jobSubMenuItems);
</script>

<template>
  <div class="modal-wrapper">
    <h2>Schedules</h2>
    <Table
      ref="schedulesTable"
      :all-data="props.selectedItemSchedules"
      :all-column-headers="columnHeaders"
      :all-column-keys="columnKeys"
      :all-column-types="columnTypes"
      :all-formatters="columnFormatters"
      :all-popover-renderers="popoverRenderers"
      :all-slotted-columns="slottedColumnConfig"
      :time-filter-key="timeFilterColumn"
      :default-columns="defaultColumns"
      :default-sort-column="defaultSortColumn"
      :default-sort-column-direction="defaultSortDirection"
      :sub-menu-items="subMenuItems"
      v-bind="tableAttributes"
    />
  </div>
</template>
