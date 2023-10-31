<script setup lang="ts">
import { computed } from "vue";

import NodeList from "@/components/nodeRepository/NodeList.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";

const props = defineProps<{ nodeTemplates: [] }>();

const hasNodeTemplates = computed(
  () => props.nodeTemplates && props.nodeTemplates.length > 0,
);
</script>

<template>
  <NodeList v-if="hasNodeTemplates" :nodes="nodeTemplates" class="node-list">
    <template #item="slotProps">
      <DraggableNodeTemplate
        v-bind="slotProps"
        @show-node-description="$emit('showNodeDescription', slotProps)"
      />
    </template>
  </NodeList>
</template>

<style lang="postcss" scoped>
& .node-list {
  margin-top: 10px;
  margin-bottom: 13px;
}
</style>
