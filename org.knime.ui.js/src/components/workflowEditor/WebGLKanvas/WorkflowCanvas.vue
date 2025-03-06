<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useWorkflowStore } from "@/store/workflow/workflow";

import Workflow from "./Workflow.vue";
import Kanvas from "./kanvas/Kanvas.vue";

const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());
</script>

<template>
  <Kanvas v-if="activeWorkflow">
    <Workflow v-if="!isWorkflowEmpty" />
  </Kanvas>
</template>
