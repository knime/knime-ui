<script lang="ts" setup>
/**
 * A pair of MetaNodePortBar items. (Or maybe one or none, depending on whether or not the metanode has in/out ports)
 */
import { useStore } from "@/composables/useStore";
import MetaNodePortBar from "./MetaNodePortBar.vue";
import { computed } from "vue";
import MoveableMetaNodePortBarContainer from "./MoveableMetaNodePortBarContainer.vue";
import { usePortBarPositions } from "@/composables/usePortBarPositions";

const store = useStore();
const workflow = computed(() => store.state.workflow.activeWorkflow);

const hasInPorts = computed(() => workflow.value.metaInPorts?.ports?.length);
const hasOutPorts = computed(() => workflow.value.metaOutPorts?.ports?.length);

const { getBounds } = usePortBarPositions();
</script>

<template>
  <g>
    <MoveableMetaNodePortBarContainer
      v-if="hasInPorts"
      type="in"
      :bounds="getBounds(false)"
    >
      <MetaNodePortBar
        type="in"
        :ports="workflow.metaInPorts.ports"
        :container-id="workflow.info.containerId"
      />
    </MoveableMetaNodePortBarContainer>
    <MoveableMetaNodePortBarContainer
      v-if="hasOutPorts"
      type="out"
      :bounds="getBounds(true)"
    >
      <MetaNodePortBar
        type="out"
        :ports="workflow.metaOutPorts.ports"
        :container-id="workflow.info.containerId"
      />
    </MoveableMetaNodePortBarContainer>
  </g>
</template>
