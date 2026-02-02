<script setup lang="ts">
import { ref, watch } from "vue";

import { sanitization } from "@knime/utils";

import type { ComponentNodeDescription } from "@/api/custom-types";
import { useNodeDescriptionStore } from "@/store/nodeDescription/nodeDescription";
import type { ComponentNodeDescriptionWithExtendedPorts } from "@/util/dataMappers";

import NodeDescriptionContent from "./NodeDescriptionContent.vue";
import NodeDescriptionLayout from "./NodeDescriptionLayout.vue";

/*
 * Renders the description of a component node that is inserted in the workflow
 */
type Props = {
  nodeId: string;
  name: string;
  showCloseButton?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: false,
});

const nodeDescriptionStore = useNodeDescriptionStore();
const isLoading = ref(false);
defineEmits<{
  close: [];
}>();

const descriptionData = ref<ComponentNodeDescriptionWithExtendedPorts | null>(
  null,
);

const sanitizeComponentDescription = (
  unsafeDescription: ComponentNodeDescription,
): ComponentNodeDescriptionWithExtendedPorts => {
  const cleaned: ComponentNodeDescription = {
    ...unsafeDescription,
    inPorts: (unsafeDescription.inPorts ?? []).map((port) => ({
      ...port,
      description: sanitization.stripHTML(port.description ?? ""),
    })),
    outPorts: (unsafeDescription.outPorts ?? []).map((port) => ({
      ...port,
      description: sanitization.stripHTML(port.description ?? ""),
    })),
  };

  return cleaned as unknown as ComponentNodeDescriptionWithExtendedPorts;
};

const loadComponentDescription = async () => {
  isLoading.value = true;

  try {
    const unsafeNodeDescription =
      await nodeDescriptionStore.getComponentDescription({
        nodeId: props.nodeId,
      });
    descriptionData.value = sanitizeComponentDescription(unsafeNodeDescription);
  } catch (error) {
    consola.error("NodeDescription::Problem fetching Component description", {
      nodeId: props.nodeId,
      error,
    });
  } finally {
    isLoading.value = false;
  }
};

watch(
  [() => props.nodeId],
  async () => {
    await loadComponentDescription();
  },
  { immediate: true },
);
</script>

<template>
  <NodeDescriptionLayout
    v-if="!isLoading && descriptionData"
    :name="name"
    :links="descriptionData.links"
    :options="descriptionData.options"
    :views="descriptionData.views"
    :in-ports="descriptionData.inPorts"
    :out-ports="descriptionData.outPorts"
    :show-close-button="showCloseButton"
    @close="$emit('close')"
  >
    <template v-if="!isLoading && descriptionData" #description>
      <NodeDescriptionContent
        :description-data="descriptionData"
        :is-component="true"
      />
    </template>
  </NodeDescriptionLayout>
</template>
