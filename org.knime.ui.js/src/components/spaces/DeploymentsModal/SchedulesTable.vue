<script setup lang="ts">
import { computed, ref } from "vue";

import { Table } from "@knime/knime-ui-table";

import {
  defaultScheduleColumns,
  scheduleHeaders,
  scheduleTypes,
  scheduleFormatters,
  scheduleSubMenuItems,
  scheduleGroupSubMenuItems,
  slottedColumns,
  schedulePopoverRenderers,
  scheduleClassGenerators,
} from "./schedulesTable.config";
import {
  defaultColumns,
  jobClassGenerators,
  popoverRenderers,
  jobHeaders,
  jobTypes,
  jobFormatters,
} from "./jobsTable.config";

const props = defineProps({
  selectedItemSchedules: {
    type: Array,
    required: true,
    default: () => [],
  },
  selectedItemJobs: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const defaultAttributes = {
  showSorting: true,
  showTimeFilter: true,
  showSearch: true,
  showColumnFilters: true,
  showPopovers: true,
  showCollapser: true,
};

const columnTypes = ref(scheduleTypes);
const columnFormatters = ref(scheduleFormatters);
const slottedColumnConfig = ref(slottedColumns);
const columnHeaders = Object.values(scheduleHeaders);
const columnKeys = ref(Object.keys(scheduleHeaders));
const tableAttributes = computed(() => defaultAttributes);

const subMenuItems = computed(() => scheduleSubMenuItems);
const groupSubMenuItems = computed(() => scheduleGroupSubMenuItems);
const jobColumnHeaders = computed(() => Object.values(jobHeaders));
const jobColumnKeys = computed(() => Object.keys(jobHeaders));
const jobColumnTypes = computed(() => jobTypes);
const jobColumnFormatters = computed(() => jobFormatters());
const selectedItemFormattedData = computed(() =>
  props.selectedItemSchedules.map((schedule) => {
    return {
      ...schedule,
      nextScheduledExecution: schedule.schedule.nextScheduledExecution,
      disabled: schedule.schedule.disabled,
    };
  }),
);

const getScheduleJobs = (id) =>
  props.selectedItemJobs.filter((job) => job.schedulerId === id);
</script>

<template>
  <div class="modal-wrapper">
    <h2>Schedules</h2>
    <Table
      ref="schedulesTable"
      :all-data="selectedItemFormattedData"
      :all-column-headers="columnHeaders"
      :all-column-keys="columnKeys"
      :all-column-types="columnTypes"
      :all-formatters="columnFormatters"
      :all-class-generators="scheduleClassGenerators"
      :all-slotted-columns="slottedColumnConfig"
      :all-popover-renderers="schedulePopoverRenderers"
      :default-columns="defaultScheduleColumns"
      :sub-menu-items="subMenuItems"
      :group-sub-menu-items="groupSubMenuItems"
      v-bind="tableAttributes"
    >
      <template #collapserContent="{ row }">
        <Table
          v-if="row.data.id && getScheduleJobs(row.data.id).length"
          class="table"
          :all-data="getScheduleJobs(row.data.id)"
          :all-column-headers="jobColumnHeaders"
          :all-column-keys="jobColumnKeys"
          :all-column-types="jobColumnTypes"
          :all-formatters="jobColumnFormatters"
          :all-class-generators="jobClassGenerators"
          :all-popover-renderers="popoverRenderers"
          :time-filter-key="'createdAt'"
          :default-columns="defaultColumns"
          :page-size="5"
          :action-button-text="'Show full details'"
          show-sorting
          show-popovers
        />
        <div v-else class="empty-message">
          No jobs available for this schedule.
        </div>
      </template>
    </Table>
  </div>
</template>

<style lang="postcss" scoped>
.empty-message {
  font-size: 13px;
  font-weight: 400;
  margin-bottom: 10px;
}
</style>
