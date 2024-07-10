<script setup lang="ts">
/**
 * A pair of MetaNodePortBar items. (Or maybe one or none, depending on whether or not the metanode has in/out ports)
 */
import { useStore } from "@/composables/useStore";
import MetaNodePortBar from "./MetaNodePortBar.vue";
import { computed } from "vue";
import MoveableMetaNodePortBarContainer from "./MoveableMetaNodePortBarContainer.vue";

const store = useStore();
// can guarantee existence of workflow (!) because this component is only rendered
// in the canvas when we actually have a workflow
const workflow = computed(() => store.state.workflow.activeWorkflow!);

const hasInPorts = computed(() => workflow.value.metaInPorts?.ports?.length);
const hasOutPorts = computed(() => workflow.value.metaOutPorts?.ports?.length);
</script>

<template>
  <g>
    <MoveableMetaNodePortBarContainer v-if="hasInPorts" type="in">
      <MetaNodePortBar
        type="in"
        :ports="workflow.metaInPorts!.ports!"
        :container-id="workflow.info.containerId"
      />
    </MoveableMetaNodePortBarContainer>
    <MoveableMetaNodePortBarContainer v-if="hasOutPorts" type="out">
      <MetaNodePortBar
        type="out"
        :ports="workflow.metaOutPorts!.ports!"
        :container-id="workflow.info.containerId"
      />
    </MoveableMetaNodePortBarContainer>
  </g>
</template>
