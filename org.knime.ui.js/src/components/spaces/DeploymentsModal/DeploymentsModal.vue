<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { storeToRefs } from "pinia";

import { KdsModal } from "@knime/kds-components";

import { useDeploymentsStore } from "@/store/spaces/deployments";
import { useSpacesStore } from "@/store/spaces/spaces";

const JobsTable = defineAsyncComponent(() => import("./JobsTable.vue"));
const SchedulesTable = defineAsyncComponent(
  () => import("./SchedulesTable.vue"),
);

const { jobs, schedules } = storeToRefs(useDeploymentsStore());
const { deploymentsModalConfig } = storeToRefs(useSpacesStore());
const { setDeploymentsModalConfig } = useSpacesStore();

const isDeploymentModalOpen = computed(
  () => deploymentsModalConfig.value.isOpen,
);
const selectedItemName = computed(
  () => `Schedules and jobs of “${deploymentsModalConfig.value.name}”`,
);

const closeModal = () => {
  setDeploymentsModalConfig({
    isOpen: false,
    name: "",
    projectId: "",
    itemId: "",
  });
};
</script>

<template>
  <KdsModal
    :active="isDeploymentModalOpen"
    :title="selectedItemName"
    icon="deploy"
    width="full"
    @close="closeModal"
  >
    <template #body>
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
  </KdsModal>
</template>

<style lang="postcss" scoped>
.no-data {
  display: flex;
  justify-content: center;
  font-size: 16px;
  font-style: italic;
  padding-top: 10px;
  color: var(--knime-masala);
}
</style>
