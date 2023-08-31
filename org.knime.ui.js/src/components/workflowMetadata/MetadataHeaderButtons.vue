<script setup lang="ts">
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import PencilIcon from "webapps-common/ui/assets/img/icons/pencil.svg";
import CloseIcon from "webapps-common/ui/assets/img/icons/close.svg";
import CheckIcon from "webapps-common/ui/assets/img/icons/check.svg";

interface Props {
  isEditing: boolean;
  isValid: boolean;
}

interface Emits {
  (e: "start-edit"): void;
  (e: "save"): void;
  (e: "cancel-edit"): void;
}

defineEmits<Emits>();
defineProps<Props>();
</script>

<template>
  <div class="buttons">
    <FunctionButton
      v-if="!isEditing"
      title="Edit metadata"
      @click="$emit('start-edit')"
    >
      <PencilIcon />
    </FunctionButton>

    <FunctionButton
      v-if="isEditing"
      :disabled="!isValid"
      title="Save metadata"
      primary
      @click="$emit('save')"
    >
      <CheckIcon />
    </FunctionButton>

    <FunctionButton
      v-if="isEditing"
      class="cancel-edit-button"
      title="Cancel edit"
      @click="$emit('cancel-edit')"
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
    --theme-button-function-background-color: white;
  }
}
</style>
