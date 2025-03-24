<script setup lang="ts">
import { FunctionButton } from "@knime/components";
import CheckIcon from "@knime/styles/img/icons/check.svg";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import CogIcon from "@knime/styles/img/icons/cog.svg";
import PencilIcon from "@knime/styles/img/icons/pencil.svg";

interface Props {
  isEditing: boolean;
  isValid: boolean;
  canOpenWorkflowConfiguration?: boolean;
}

interface Emits {
  (e: "startEdit"): void;
  (e: "save"): void;
  (e: "openWorkflowConfiguration"): void;
  (e: "cancelEdit"): void;
}

defineEmits<Emits>();
withDefaults(defineProps<Props>(), {
  canOpenWorkflowConfiguration: false,
});
</script>

<template>
  <div class="buttons">
    <FunctionButton
      v-if="!isEditing && canOpenWorkflowConfiguration"
      title="Open workflow configuration"
      data-test-id="open-workflow-configuration"
      @click="$emit('openWorkflowConfiguration')"
    >
      <CogIcon />
    </FunctionButton>

    <FunctionButton
      v-if="!isEditing"
      title="Edit metadata"
      data-test-id="edit-button"
      @click="$emit('startEdit')"
    >
      <PencilIcon />
    </FunctionButton>

    <FunctionButton
      v-if="isEditing"
      :disabled="!isValid"
      title="Save metadata"
      data-test-id="save-button"
      primary
      @click="$emit('save')"
    >
      <CheckIcon />
    </FunctionButton>

    <FunctionButton
      v-if="isEditing"
      class="cancel-edit-button"
      title="Cancel edit"
      data-test-id="cancel-edit-button"
      @click="$emit('cancelEdit')"
    >
      <CloseIcon />
    </FunctionButton>
  </div>
</template>

<style scoped lang="postcss">
.buttons {
  display: flex;
  gap: 4px;
  margin-left: auto;

  & .cancel-edit-button {
    --theme-button-function-background-color: var(--knime-white);
  }
}
</style>
