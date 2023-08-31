<script setup lang="ts">
import Label from "webapps-common/ui/components/forms/Label.vue";
import TextArea from "webapps-common/ui/components/forms/TextArea.vue";
import InputField from "webapps-common/ui/components/forms/InputField.vue";
import PortIcon from "webapps-common/ui/components/node/PortIcon.vue";
import { NodePortDescription } from "@/api/gateway-api/generated-api";

interface Props {
  modelValue: Array<NodePortDescription>;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", ports: Array<NodePortDescription>): void;
}>();

const updateField = <
  K extends keyof NodePortDescription,
  V = NodePortDescription[K],
>(
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
      <svg viewBox="-4.5 -4.5 9 9" width="12" height="12">
        <PortIcon
          :color="port.color"
          :filled="!port.optional"
          :type="port.type"
        />
      </svg>
      <div class="port-title">{{ index + 1 }}: Type: {{ port.typeName }}</div>
    </div>
    <Label text="Name" compact class="label">
      <div>
        <InputField
          :model-value="port.name"
          type="text"
          title="Port name"
          @update:model-value="updateField('name', $event, index)"
        />
      </div>
    </Label>
    <Label text="Description" compact class="label">
      <div>
        <TextArea
          :model-value="port.description"
          class="port-description-editor"
          type="text"
          title="Port description"
          @update:model-value="updateField('description', $event, index)"
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
    margin: 16px 0 8px;
    display: flex;

    & :deep(svg) {
      margin-top: 2px;
    }

    & .port-title {
      margin-left: 5px;
    }
  }

  & .label {
    padding-top: 8px;
  }
}
</style>
