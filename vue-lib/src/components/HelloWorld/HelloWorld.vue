<script setup lang="ts">
import { inject, ref } from 'vue'

const data = ref()

const api = inject('hubApi')
const callApi = async () => {
  // @ts-ignore
  const res = await api.getWorkflowVersions('workflowWithVersions')
  console.log('res :>> ', res)
  // @ts-ignore
  api.getWorkflowVersions('workflowToExecute', 'executionContextId')
}
</script>

<template>
  <div class="greetings">
    <h1 class="green">Demo component</h1>
    <button @click="callApi">Fetch data from hub API</button>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
