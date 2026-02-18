<script setup lang="ts">
import { computed } from "vue";

import { sanitization } from "@knime/utils";

import { type ExtendedPortType } from "@/lib/data-mappers";

import DescriptionText from "./DescriptionText.vue";
import NodeDescriptionLayout from "./NodeDescriptionLayout.vue";

/*
 * Renders the description of a component's template (e.g from search)
 */
type Props = {
  name: string;
  description: string;
  inPorts: Array<ExtendedPortType & { description: string }>;
  outPorts: Array<ExtendedPortType & { description: string }>;
};

const props = defineProps<Props>();

defineEmits<{ close: [] }>();

const sanitizedDescription = computed(() =>
  sanitization.stripHTML(props.description),
);

const sanizitedInputPorts = computed(() =>
  props.inPorts.map((port) => ({
    ...port,
    description: sanitization.stripHTML(port.description ?? ""),
  })),
);
const sanizitedOutputPorts = computed(() =>
  props.outPorts.map((port) => ({
    ...port,
    description: sanitization.stripHTML(port.description ?? ""),
  })),
);
</script>

<template>
  <NodeDescriptionLayout
    :name="name"
    :in-ports="sanizitedInputPorts"
    :out-ports="sanizitedOutputPorts"
    :show-close-button="true"
    @close="$emit('close')"
  >
    <template #description>
      <DescriptionText :value="sanitizedDescription" />
    </template>
  </NodeDescriptionLayout>
</template>
