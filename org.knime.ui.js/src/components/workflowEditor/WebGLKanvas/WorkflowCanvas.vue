<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useDropNode } from "@/composables/useDropNode";
import { useWorkflowStore } from "@/store/workflow/workflow";

import Workflow from "./Workflow.vue";
import Kanvas from "./kanvas/Kanvas.vue";

const { onDrop, onDragOver } = useDropNode();
const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());
</script>

<template>
  <Kanvas
    v-if="activeWorkflow"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
  >
    <Workflow v-if="!isWorkflowEmpty" />
  </Kanvas>
</template>
