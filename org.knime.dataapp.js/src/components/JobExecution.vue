<script setup lang="ts">
import { onBeforeMount } from "vue";
import { useStore } from "vuex";

import { useExecutionResult } from "@/composables/useExecutionResult";
import { useJobExecution } from "@/composables/useJobExecution";
import { useConstants } from "@/plugins/constants";

import ExecutionProgress from "./ExecutionProgress/ExecutionProgress.vue";
import ReportPreview from "./ReportPreview.vue";
import Result from "./Result.vue";
import WizardNavigation from "./WizardNavigation/WizardNavigation.vue";

const store = useStore();
const { messageHeader, messages, success } = useExecutionResult();
const {
  isPageValid,
  showResult,
  showProgress,
  showPageBuilder,
  showReport,
  executionState,
  showControlBar,
  sectionStyles,
} = useJobExecution();

const { jobId } = useConstants();

onBeforeMount(async () => {
  await store.dispatch("wizardExecution/fetchPage", { jobId });
});
</script>

<template>
  <Result
    v-if="showResult"
    :success="success"
    :messages="messages"
    :message-header="messageHeader"
  />
  <section :style="sectionStyles">
    <div class="grid-container">
      <div class="grid-item-12">
        <PageBuilder v-if="showPageBuilder && isPageValid" />
        <ExecutionProgress v-if="showProgress" :execution-state="executionState" />
        <ReportPreview v-else-if="showReport" class="report" />
      </div>
    </div>
  </section>
  <WizardNavigation v-if="showControlBar" />
</template>

<style lang="postcss" scoped>
main {
  overflow-x: auto; /* allow page content to overflow without breaking application layout  */
}

section.report {
  margin-top: 40px;
}
</style>
