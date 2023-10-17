<script lang="ts" setup>
/**
 * A pair of MetaNodePortBar items. (Or maybe one or none, depending on whether or not the metanode has in/out ports)
 */
import { useStore } from "vuex";
import MetaNodePortBar from "./MetaNodePortBar.vue";
import { computed } from "vue";
import { usePortBarPositions } from "@/composables/usePortBarPositions";

const store = useStore();
const workflow = computed(() => store.state.workflow.activeWorkflow);

const hasInPorts = computed(() => workflow.value.metaInPorts?.ports?.length);
const hasOutPorts = computed(() => workflow.value.metaOutPorts?.ports?.length);

const portBarPositions = usePortBarPositions();

const portBarXPos = portBarPositions.portBarXPos;
const portBarYPos = computed(() => portBarPositions.portBarYPos.value);
</script>

<template>
  <g>
    <MetaNodePortBar
      v-if="hasInPorts"
      type="in"
      :ports="workflow.metaInPorts.ports"
      :position="{
        x: portBarXPos(workflow.metaInPorts, false),
        y: portBarYPos,
      }"
      :container-id="workflow.info.containerId"
    />
    <MetaNodePortBar
      v-if="hasOutPorts"
      type="out"
      :ports="workflow.metaOutPorts.ports"
      :position="{
        x: portBarXPos(workflow.metaOutPorts, true),
        y: portBarYPos,
      }"
      :container-id="workflow.info.containerId"
    />
  </g>
</template>
