<script setup lang="ts">
import { computed, ref } from "vue";

import { Table as KnimeUiTable } from "@knime/knime-ui-table";
import type { Job } from "@/api/custom-types";

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
} from "./jobsTable.config";

type Props = {
  selectedItemJobs: Job[];
  showHeader?: boolean;
  showSearch?: boolean;
  showColumnFilters?: boolean;
  pageSize?: number;
};

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  showSearch: true,
  showColumnFilters: true,
  pageSize: 10,
});

const defaultAttributes = {
  showSorting: true,
  showSearch: props.showSearch,
  showColumnFilters: props.showColumnFilters,
  showPopovers: true,
};

const columnTypes = ref(jobTypes);
const columnFormatters = ref(jobFormatters());
const columnClassGenerators = ref(jobClassGenerators);
const timeFilterColumn = ref("createdAt");
const slottedColumnConfig = ref(slottedColumns);
const columnHeaders = ref(Object.values(jobHeaders));
const columnKeys = ref(Object.keys(jobHeaders));

const tableAttributes = computed(() => defaultAttributes);
const subMenuItems = computed(() => jobSubMenuItems);
</script>

<template>
  <div class="modal-wrapper">
    <h2 v-if="showHeader">Jobs</h2>
    <KnimeUiTable
      ref="jobsTable"
      :all-data="props.selectedItemJobs"
      :all-column-headers="columnHeaders"
      v-bind="tableAttributes"
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
      :page-size="props.pageSize"
    />
  </div>
</template>
