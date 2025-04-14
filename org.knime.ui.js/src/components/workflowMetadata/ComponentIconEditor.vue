<script setup lang="ts">
import { FunctionButton, Label } from "@knime/components";
import TrashIcon from "@knime/styles/img/icons/trash.svg";

import IconBase64UploadButton from "@/components/common/IconBase64UploadButton.vue";

interface Props {
  modelValue: string | null;
}

const emit = defineEmits<{
  (e: "update:modelValue", componentType: string | null): void;
}>();

defineProps<Props>();
</script>

<template>
  <Label text="Icon" compact class="label">
    <div>
      <IconBase64UploadButton
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <FunctionButton
        aria-label="Remove icon"
        class="delete-link-btn"
        @click="emit('update:modelValue', null)"
      >
        <TrashIcon aria-hidden="true" focusable="false" />
      </FunctionButton>
    </div>
  </Label>
</template>

<style scoped lang="postcss">
.label {
  margin-bottom: 10px;

  & div {
    display: flex;

    & .delete-link-btn {
      margin-left: auto;
    }
  }
}
</style>
