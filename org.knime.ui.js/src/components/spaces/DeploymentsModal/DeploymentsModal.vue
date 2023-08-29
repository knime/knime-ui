<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";

import Modal from "webapps-common/ui/components/Modal.vue";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";

import JobsTable from "./JobsTable.vue";
import SchedulesTable from "./SchedulesTable.vue";

const store = useStore();

const isDisplayDeploymentsModalOpen = computed(
  () => store.state.spaces.displayDeploymentsModal.isOpen,
);
const selectedItemName = computed(
  () =>
    `Schedules and jobs of “${store.state.spaces.displayDeploymentsModal.name}”`,
);
const jobs = computed(() => store.state.spaces.jobs);
const schedules = computed(() => store.state.spaces.schedules);

const closeModal = () => {
  store.commit("spaces/setDisplayDeploymentsModal", {
    isOpen: false,
    name: null,
  });
};
</script>

<template>
  <Modal
    v-show="isDisplayDeploymentsModalOpen"
    ref="modalRef"
    :active="isDisplayDeploymentsModalOpen"
    :title="selectedItemName"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #icon><CirclePlayIcon /></template>
    <template #confirmation>
      <div v-if="jobs.length > 0 || schedules.length > 0">
        <SchedulesTable
          v-if="schedules.length > 0"
          :selected-item-schedules="schedules"
        />
        <JobsTable v-if="jobs.length > 0" :selected-item-jobs="jobs" />
      </div>
      <h2 v-else class="no-data">There are no schedules or jobs to display.</h2>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 80%;
}

.no-data {
  display: flex;
  justify-content: center;
  color: var(--knime-masala);
}

:deep() {
  & .confirmation {
    background-color: var(--knime-porcelain);
    overflow-x: hidden;
    overflow-y: auto;
    flex-grow: 1;
  }

  & .controls {
    background-color: var(--knime-porcelain);
    padding: 0;
  }

  & .inner {
    top: 50%;
    max-height: 90%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  &.modal-wrapper h2 {
    color: var(--knime-masala);
  }

  & .state {
    display: inline-block;
    padding-left: 20px;
    margin-left: -20px;

    &::before {
      content: "●";
      font-size: 10px;
      position: static;
      top: -1px;
      margin-right: 8px;
    }
  }

  & .execution-finished {
    color: var(--theme-color-success);
  }

  & .failed {
    color: var(--theme-color-error);
  }

  & .executing {
    color: var(--theme-color-running);
  }

  & .interaction-required {
    color: var(--theme-color-action-required);
  }
}
</style>
