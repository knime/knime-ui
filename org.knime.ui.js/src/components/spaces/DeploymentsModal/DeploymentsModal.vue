<script setup lang="ts">
import { defineAsyncComponent, computed } from "vue";
import { useStore } from "@/composables/useStore";

import Modal from "webapps-common/ui/components/Modal.vue";
import DeploymentIcon from "@knime/styles/img/icons/deployment.svg";

const JobsTable = defineAsyncComponent(() => import("./JobsTable.vue"));
const SchedulesTable = defineAsyncComponent(
  () => import("./SchedulesTable.vue"),
);

const store = useStore();

const isDeploymentModalOpen = computed(
  () => store.state.spaces.deploymentsModalConfig.isOpen,
);
const selectedItemName = computed(
  () =>
    `Schedules and jobs of “${store.state.spaces.deploymentsModalConfig.name}”`,
);
const jobs = computed(() => store.state.spaces.jobs);
const schedules = computed(() => store.state.spaces.schedules);

const closeModal = () => {
  store.commit("spaces/setDeploymentsModalConfig", {
    isOpen: false,
    name: null,
    projectId: null,
    itemId: null,
  });
};
</script>

<template>
  <Modal
    v-show="isDeploymentModalOpen"
    :active="isDeploymentModalOpen"
    :title="selectedItemName"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #icon><DeploymentIcon /></template>
    <template #confirmation>
      <SchedulesTable
        v-if="schedules.length > 0"
        :schedules="schedules"
        :jobs="jobs"
      />
      <JobsTable v-if="jobs.length > 0" :jobs="jobs" />
      <span v-if="jobs.length === 0 && schedules.length === 0" class="no-data"
        >There are no schedules or jobs to display.</span
      >
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 80%;
  --z-index-common-modal: 55;
}

.no-data {
  display: flex;
  justify-content: center;
  font-size: 16px;
  font-style: italic;
  padding-top: 10px;
  color: var(--knime-masala);
}

:deep() {
  & .confirmation {
    background-color: var(--knime-porcelain);
    overflow: hidden auto;
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

  & .node-messages {
    display: inline-block;
    padding-left: 20px;
    margin-left: 20px;
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
