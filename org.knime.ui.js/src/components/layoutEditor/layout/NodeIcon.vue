<script setup lang="ts">
import { ref, watch } from "vue";

import MissingIcon from "@knime/styles/img/icons/circle-help.svg";
import ComponentIcon from "@knime/styles/img/icons/layout-editor.svg";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

const props = defineProps<{
  nodeSuffix: string;
}>();

const isComponent = ref<boolean>(false);
const icon = ref<string | null>(null);

watch(
  () => props.nodeSuffix,
  () => {
    const component = useLayoutEditorStore().layoutContext;
    if (component) {
      const nodeId = `${component.nodeId}:0:${props.nodeSuffix}`;
      const node = useWorkflowStore().activeWorkflow!.nodes[nodeId];

      isComponent.value = node && node.kind === "component";
      icon.value = useNodeInteractionsStore().getNodeIcon(nodeId) || null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <span class="node-element-icon-container">
    <ComponentIcon v-if="isComponent" class="node-element-icon" />
    <img v-else-if="icon !== null" :src="icon" alt="Icon of the node" />
    <MissingIcon v-else class="node-element-icon" />
  </span>
</template>

<style lang="postcss" scoped>
@import url("@knime/styles/css/mixins.css");

.node-element-icon-container {
  display: inline-flex;
  height: var(--space-16);
  width: var(--space-16);
}

.node-element-icon {
  @mixin svg-icon-size var(--space-16);

  scale: 120%;
}
</style>
