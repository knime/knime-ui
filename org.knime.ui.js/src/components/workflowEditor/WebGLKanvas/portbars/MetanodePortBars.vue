<script setup lang="ts">
/**
 * A pair of MetaNodePortBar items. (Or maybe one or none, depending on whether or not the metanode has in/out ports)
 */
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useWorkflowStore } from "@/store/workflow/workflow";

import MetanodePortBar from "./MetanodePortBar.vue";

const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);

// can guarantee existence of workflow (!) because this component is only rendered
// in the canvas when we actually have a workflow
const hasInPorts = computed(
  () => activeWorkflow.value!.metaInPorts?.ports?.length,
);
const hasOutPorts = computed(
  () => activeWorkflow.value!.metaOutPorts?.ports?.length,
);
</script>

<template>
  <MetanodePortBar
    v-if="hasInPorts"
    type="in"
    :ports="activeWorkflow!.metaInPorts!.ports!"
    :container-id="activeWorkflow!.info.containerId"
  />

  <MetanodePortBar
    v-if="hasOutPorts"
    type="out"
    :ports="activeWorkflow!.metaOutPorts!.ports!"
    :container-id="activeWorkflow!.info.containerId"
  />
</template>
