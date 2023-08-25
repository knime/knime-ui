<script lang="ts">
import { defineComponent } from "vue";
// import { computed } from "vue";
// import { useStore } from "vuex";
import { mapState } from "vuex";

import { Table } from "@knime/knime-ui-table";
import Modal from "webapps-common/ui/components/Modal.vue";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";
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

// const store = useStore();
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
    Modal,
    CirclePlayIcon,
  },
  data() {
    return {
      columnTypes: jobTypes,
      columnFormatters: jobFormatters(this.$store),
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
    ...mapState("spaces", ["displayJobModal", "jobs"]),
    isDisplayJobModalOpen() {
      return this.displayJobModal.isOpen;
    },
    selectedItemName() {
      return `Deployments and jobs of "${this.displayJobModal.name}"`;
    },
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
  methods: {
    closeModal() {
      // const a = selectedItemJobs.value[0].createdAt;
      // const b = a.replace(/\[.*\]/, "");
      // console.log(a);

      // console.log(
      //   new Date(a * 1000).toLocaleDateString("en-US", {
      //     month: "long",
      //     day: "numeric",
      //     year: "numeric",
      //   }),
      // );
      // formatDate(selectedItemJobs.value[0].createdAt);
      this.$store.commit("spaces/setDisplayJobModal", {
        isOpen: false,
      });
    },
  },
});
// const store = useStore();

// const isDisplayJobModalOpen = computed(
//   () => store.state.spaces.displayJobModal.isOpen,
// );
// const selectedItemName = computed(
//   () => `Deployments and jobs of "${store.state.spaces.displayJobModal.name}"`,
// );
// const selectedItemJobs = computed(() => store.state.spaces.jobs);

// const defaultAttributes = {
//   showSorting: true,
//   showTimeFilter: true,
//   showSearch: true,
//   showColumnFilters: true,
//   showBottomControls: true,
//   showPopovers: true,
// };

// const tableAttributes = computed(() => defaultAttributes);
// const closeModal = () => {
//   console.log(selectedItemJobs);
//   formatDate(selectedItemJobs.value[0].createdAt);
//   store.commit("spaces/setDisplayJobModal", {
//     isOpen: false,
//   });
// };

// const formatDate = (date: number) => {
//   const timezoneRegexPattern = /\[.*\]/;
//   const formattedDate = new Date(
//     Date.parse(date.toString().replace(timezoneRegexPattern, "")),
//   );
//   console.log(formattedDate);

//   return formattedDate.toLocaleString("en-US");
// };

// const closeModal = () => {
//   const a = selectedItemJobs.value[0].createdAt;
//   // const b = a.replace(/\[.*\]/, "");
//   console.log(a);

//   console.log(
//     new Date(a * 1000).toLocaleDateString("en-US", {
//       month: "long",
//       day: "numeric",
//       year: "numeric",
//     }),
//   );
//   // formatDate(selectedItemJobs.value[0].createdAt);
//   store.commit("spaces/setDisplayJobModal", {
//     isOpen: false,
//   });
// };
</script>

<template>
  <Modal
    v-show="isDisplayJobModalOpen"
    ref="modalRef"
    :active="isDisplayJobModalOpen"
    :title="selectedItemName"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #icon><CirclePlayIcon /></template>
    <template #confirmation>
      <div class="wrapper">
        <!-- <template> -->
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
        <!-- </template> -->
        <!-- <h2>Jobs</h2>
        <table v-if="selectedItemJobs.length > 0">
          <thead>
            <tr>
              <th class="created-at">Created at</th>
              <th class="owner">Owner</th>
              <th class="state">State</th>
              <th class="node-messages">Node messages</th>
              <th class="action" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in selectedItemJobs" :key="job.id">
              <td>{{ job.startedExecutionAt }}</td>
              <td>{{ job.owner }}</td>
              <td>{{ job.state }}</td>
              <td>0 Messages</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-message">No jobs available.</p> -->
      </div>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 80%;
}

:deep(.state) {
  & a {
    display: inline-block;
    padding-left: 20px;
    margin-left: -20px;
  }

  &::before {
    content: "●";
    font-size: 10px;
    position: static;
    top: -1px;
    margin-right: 8px;
  }

  &.failed {
    color: var(--theme-color-error);
  }

  &.success {
    color: var(--theme-color-success);
  }

  &.running {
    color: var(--theme-color-running);
  }

  &.interaction-required {
    color: var(--theme-color-action-required);
  }
}
</style>
