<script setup lang="ts">
/**
 * A pair of MetaNodePortBar items. (Or maybe one or none, depending on whether or not the metanode has in/out ports)
 */
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useWorkflowStore } from "@/store/workflow/workflow";

import MetaNodePortBar from "./MetaNodePortBar.vue";
import MoveableMetaNodePortBarContainer from "./MoveableMetaNodePortBarContainer.vue";

const workflowStore = useWorkflowStore();
const { activeWorkflow: workflow } = storeToRefs(workflowStore);

// can guarantee existence of workflow (!) because this component is only rendered
// in the canvas when we actually have a workflow
const hasInPorts = computed(() => workflow.value!.metaInPorts?.ports?.length);
const hasOutPorts = computed(() => workflow.value!.metaOutPorts?.ports?.length);
</script>

<template>
  <g>
    <MoveableMetaNodePortBarContainer v-if="hasInPorts" type="in">
      <MetaNodePortBar
        type="in"
        :ports="workflow!.metaInPorts!.ports!"
        :container-id="workflow!.info.containerId"
      />
    </MoveableMetaNodePortBarContainer>
    <MoveableMetaNodePortBarContainer v-if="hasOutPorts" type="out">
      <MetaNodePortBar
        type="out"
        :ports="workflow!.metaOutPorts!.ports!"
        :container-id="workflow!.info.containerId"
      />
    </MoveableMetaNodePortBarContainer>
  </g>
</template>
