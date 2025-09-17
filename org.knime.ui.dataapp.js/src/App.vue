<script setup lang="ts">
import { onBeforeMount } from "vue";
import { useStore } from "vuex";

import { useConstants } from "./plugins/constants";
import { pageBuilderLoader } from "./util/pagebuilderLoader/pagebuilderLoader";

const { restApiBaseUrl, jobId } = useConstants();

const store = useStore();

onBeforeMount(() => {
  pageBuilderLoader(restApiBaseUrl, jobId, store);
});
</script>

<template>
  <h1>You did it!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
  </p>
</template>

<style scoped></style>
