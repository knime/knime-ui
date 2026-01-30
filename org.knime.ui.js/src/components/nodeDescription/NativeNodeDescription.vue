<script setup lang="ts">
import { ref, watch } from "vue";

import type { NodeFactoryKey } from "@/api/gateway-api/generated-api";
import { useNodeDescriptionStore } from "@/store/nodeDescription/nodeDescription";
import { type NativeNodeDescriptionWithExtendedPorts } from "@/util/dataMappers";

import NodeDescriptionContent from "./NodeDescriptionContent.vue";
import NodeDescriptionExtensionInfo from "./NodeDescriptionExtensionInfo.vue";
import NodeDescriptionLayout from "./NodeDescriptionLayout.vue";

/*
 * Component that renders a NativeNode's description, based on its template information
 */
type Props = {
  name: string;
  nodeTemplateId: string;
  nodeFactory: NodeFactoryKey;
  showCloseButton?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: false,
});

const nodeDescriptionStore = useNodeDescriptionStore();
const isLoading = ref(false);
defineEmits<{ close: [] }>();

const descriptionData = ref<NativeNodeDescriptionWithExtendedPorts | null>(
  null,
);

const loadNativeNodeDescription = async () => {
  isLoading.value = true;

  try {
    descriptionData.value = await nodeDescriptionStore.getNativeNodeDescription(
      {
        factoryId: props.nodeTemplateId,
        nodeFactory: props.nodeFactory,
      },
    );
  } catch (error) {
    consola.error("NodeDescription::Problem fetching NativeNode description", {
      nodeTemplateId: props.nodeTemplateId,
      error,
    });
  } finally {
    isLoading.value = false;
  }
};

watch(
  [() => props.nodeTemplateId],
  async () => {
    await loadNativeNodeDescription();
  },
  { immediate: true },
);
</script>

<template>
  <NodeDescriptionLayout
    v-if="!isLoading && descriptionData"
    :name="name"
    :links="descriptionData.links"
    :views="descriptionData.views"
    :in-ports="descriptionData.inPorts"
    :out-ports="descriptionData.outPorts"
    :dyn-in-ports="descriptionData.dynInPorts"
    :dyn-out-ports="descriptionData.dynOutPorts"
    :show-close-button="showCloseButton"
    @close="$emit('close')"
  >
    <template #description>
      <NodeDescriptionContent
        :description-data="descriptionData"
        :is-component="false"
      />
    </template>

    <template v-if="descriptionData.extension" #extension-info>
      <NodeDescriptionExtensionInfo :description-data="descriptionData" />
    </template>
  </NodeDescriptionLayout>
</template>
