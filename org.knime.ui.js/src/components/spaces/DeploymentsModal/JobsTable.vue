<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";

import { Table } from "@knime/knime-ui-table";
import {
  defaultColumns,
  defaultSortColumn,
  defaultSortDirection,
  jobHeaders,
  jobTypes,
  jobFormatters,
  jobClassGenerators,
  popoverRenderers,
  slottedColumns,
  jobSubMenuItems,
} from "./jobtable.config";

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
  data() {
    return {
      columnTypes: jobTypes,
      columnFormatters: jobFormatters(),
      columnClassGenerators: jobClassGenerators,
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
    ...mapState("spaces", ["jobs"]),
    selectedItemJobs() {
      return this.jobs;
    },
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
    <h2>Jobs</h2>
    <Table
      ref="jobsTable"
      :all-data="selectedItemJobs"
      :all-column-headers="columnHeaders"
      :all-column-keys="columnKeys"
      :all-column-types="columnTypes"
      :all-formatters="columnFormatters"
      :all-class-generators="columnClassGenerators"
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
