<script lang="ts" setup>
/**
 * A pair of MetaNodePortBar items. (Or maybe one or none, depending on whether or not the metanode has in/out ports)
 */
import { useStore } from "@/composables/useStore";
import MetaNodePortBar from "./MetaNodePortBar.vue";
import { computed } from "vue";

const store = useStore();
const workflow = computed(() => store.state.workflow.activeWorkflow);

const hasInPorts = computed(() => workflow.value.metaInPorts?.ports?.length);
const hasOutPorts = computed(() => workflow.value.metaOutPorts?.ports?.length);
</script>

<template>
  <g>
    <MetaNodePortBar
      v-if="hasInPorts"
      type="in"
      :ports="workflow.metaInPorts.ports"
      :container-id="workflow.info.containerId"
    />
    <MetaNodePortBar
      v-if="hasOutPorts"
      type="out"
      :ports="workflow.metaOutPorts.ports"
      :container-id="workflow.info.containerId"
    />
  </g>
</template>
