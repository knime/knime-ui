<script setup lang="ts">
import { computed, ref } from "vue";

import { Table as KnimeUiTable } from "@knime/knime-ui-table";
import type { Job, Schedule } from "@/api/custom-types";

import JobsTable from "./JobsTable.vue";
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

type Props = {
  schedules: Schedule[];
  jobs: Job[];
};

const props = defineProps<Props>();

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
const selectedItemFormattedData = computed(() =>
  props.schedules.map((schedule) => {
    return {
      ...schedule,
      nextScheduledExecution: schedule.schedule.nextScheduledExecution,
      disabled: schedule.schedule.disabled,
    };
  }),
);

const getScheduleJobs = (id: string) =>
  props.jobs.filter((job) => job.schedulerId === id);
</script>

<template>
  <div class="modal-wrapper">
    <h2>Schedules</h2>
    <KnimeUiTable
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
        <JobsTable
          v-if="row.id && getScheduleJobs(row.id).length"
          :show-search="false"
          :show-column-filters="false"
          :page-size="5"
          :is-inside-schedule="true"
          class="table"
          :jobs="getScheduleJobs(row.id)"
        />
        <div v-else class="empty-message">
          No jobs available for this schedule.
        </div>
      </template>
    </KnimeUiTable>
  </div>
</template>

<style lang="postcss" scoped>
.empty-message {
  font-size: 13px;
  font-weight: 400;
  margin-bottom: 10px;
}
</style>
