<script setup lang="ts">
import { ref, watch } from "vue";

import MissingIcon from "@knime/styles/img/icons/circle-help.svg";
import ComponentIcon from "@knime/styles/img/icons/layout-editor.svg";

import type { ConfigurationLayoutEditorNode } from "@/store/layoutEditor/types/configuration";
import type { LayoutEditorNode } from "@/store/layoutEditor/types/view";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";

const props = defineProps<{
  node: LayoutEditorNode | ConfigurationLayoutEditorNode;
}>();

const isComponent = ref<boolean>(false);
const icon = ref<string>();

const nodeTemplatesStore = useNodeTemplatesStore();

watch(
  () => props.node.templateId,
  async () => {
    isComponent.value = props.node.type === "nestedLayout";

    if (props.node.templateId === null) {
      return;
    }

    try {
      const template = await nodeTemplatesStore.getSingleNodeTemplate({
        nodeTemplateId: props.node.templateId,
      });
      icon.value = template?.icon;
    } catch (error) {
      consola.error("Failed to get icon from template", { error });
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
