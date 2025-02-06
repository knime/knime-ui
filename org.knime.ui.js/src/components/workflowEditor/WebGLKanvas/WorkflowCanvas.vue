<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useWorkflowStore } from "@/store/workflow/workflow";

import Workflow from "./Workflow.vue";
import Kanvas from "./kanvas/Kanvas.vue";

const { activeWorkflow } = storeToRefs(useWorkflowStore());
</script>

<template>
  <Kanvas>
    <Workflow v-if="activeWorkflow" />
  </Kanvas>
</template>
