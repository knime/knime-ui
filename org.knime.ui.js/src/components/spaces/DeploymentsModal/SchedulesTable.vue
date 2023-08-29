<script lang="ts">
import { defineComponent } from "vue";

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

export default defineComponent({
  components: {
    Table,
  },
  props: {
    selectedItemSchedules: { type: Array, default: () => [] },
  },
  data() {
    return {
      columnTypes: jobTypes,
      columnFormatters: jobFormatters(),
      timeFilterColumn: "createdAt",
      currentSelection: [],
      popoverRenderers,
      defaultColumns,
      defaultSortColumn,
      defaultSortDirection,
      slottedColumnConfig: slottedColumns,
      columnHeaders: Object.values(jobHeaders),
      columnKeys: Object.keys(jobHeaders),
    };
  },
  computed: {
    tableAttributes() {
      return defaultAttributes;
    },
    subMenuItems() {
      return jobSubMenuItems;
    },
  },
});
</script>

<template>
  <div class="modal-wrapper">
    <h2>Schedules</h2>
    <Table
      ref="schedulesTable"
      :all-data="selectedItemSchedules"
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
