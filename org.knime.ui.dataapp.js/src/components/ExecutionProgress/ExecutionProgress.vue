<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";

import { LoadingIcon } from "@knime/components";

import { progressMessages, wizardExecutionStates } from "@/config";

import JobStatus from "./JobStatus.vue";
import ProgressBar from "./ProgressBar.vue";
import ProgressStatus from "./ProgressStatus.vue";

const { LOADING, EXECUTING } = wizardExecutionStates;

const { executionState = undefined } = defineProps<{
  executionState?: (typeof wizardExecutionStates)[keyof typeof wizardExecutionStates];
}>();

const store = useStore();

const totalPercentage = computed(() => store.state.wizardExecution.totalPercentage);
const loading = computed(() => executionState === LOADING);
const executing = computed(() => executionState === EXECUTING);
const stopped = computed(() => !loading.value && !executing.value);
const message = computed(() =>
  executionState ? progressMessages[executionState] : progressMessages.DEFAULT,
);
</script>

<template>
  <JobStatus :title="message" :class="{ stopped }">
    <template #status>
      <transition v-if="loading" appear name="fade">
        <LoadingIcon class="loading-icon" />
      </transition>
      <transition v-else appear name="fade">
        <ProgressStatus :cancel="stopped" />
      </transition>
    </template>
    <template #graph>
      <transition v-if="!loading" appear name="fade">
        <div class="progress-bar">
          <ProgressBar :percentage="totalPercentage" />
        </div>
      </transition>
    </template>
  </JobStatus>
</template>

<style lang="postcss" scoped>
.stopped {
  opacity: 0.5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity linear 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.progress-bar {
  width: 100%;
}

.loading-icon {
  width: 24px;
  height: 24px;
  stroke-width: calc(32px / 24);
  margin: auto;
  stroke: var(--knime-masala);
}
</style>
