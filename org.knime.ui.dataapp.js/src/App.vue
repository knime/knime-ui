<script setup lang="ts">
import { onBeforeMount, ref } from "vue";
import { useStore } from "vuex";

import JobExecution from "./components/JobExecution.vue";
import { useConstants } from "./plugins/constants";
import { embeddingBridge } from "./util/embedding/embeddingBridge";
import { pageBuilderLoader } from "./util/pagebuilderLoader/pagebuilderLoader";

const { restApiBaseUrl, jobId } = useConstants();

const isReady = ref(false);
const store = useStore();

onBeforeMount(async () => {
  try {
    await pageBuilderLoader(restApiBaseUrl, jobId, store);
    isReady.value = true;
  } catch (error) {
    embeddingBridge.sendAppInitializationError(error);
  }
});
</script>

<template>
  <JobExecution v-if="isReady" />
</template>
