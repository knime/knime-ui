<script setup lang="ts">
import { InputField, Label, TextArea } from "@knime/components";

import type {
  NodePortDescription,
  PortType,
} from "@/api/gateway-api/generated-api";
import portIconRenderer from "@/components/common/PortIconRenderer";
import { sanitizeHTML } from "@/util/sanitization";

export type PortEditorData = Pick<PortType, "color"> & NodePortDescription;

interface Props {
  modelValue: Array<PortEditorData>;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", ports: Array<PortEditorData>): void;
}>();

const updateField = <K extends keyof PortEditorData, V = PortEditorData[K]>(
  property: K,
  value: V,
  index: number,
) => {
  emit(
    "update:modelValue",
    props.modelValue.map((port, _index) => {
      return index === _index ? { ...port, [property]: value } : port;
    }),
  );
};
</script>

<template>
  <div v-for="(port, index) in modelValue" :key="index" class="port-editor">
    <div class="port-header">
      <Component :is="portIconRenderer(port, 12)" />
      <div class="port-title">{{ index + 1 }}: Type: {{ port.typeName }}</div>
    </div>
    <Label text="Name" class="label">
      <div>
        <InputField
          :model-value="port.name"
          type="text"
          title="Port name"
          :maxlength="$characterLimits.metadata.component.portName"
          @update:model-value="updateField('name', $event, index)"
        />
      </div>
    </Label>
    <Label text="Description" class="label">
      <div>
        <TextArea
          :model-value="port.description"
          class="port-description-editor"
          title="Port description"
          :maxlength="$characterLimits.metadata.component.portDescription"
          @update:model-value="
            updateField('description', sanitizeHTML($event), index)
          "
        />
      </div>
    </Label>
  </div>
</template>

<style scoped lang="postcss">
.port-editor {
  & .port-description-editor {
    max-width: 100%;

    & :deep(textarea) {
      width: 100%;
      height: 120px;
      display: block;
      resize: vertical;
    }
  }

  & .port-header {
    margin: 20px 0 10px;
    display: flex;

    & .port-title {
      margin-left: 5px;
    }
  }

  & .label {
    margin-top: 10px;
  }
}
</style>
