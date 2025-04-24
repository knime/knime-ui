<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";

import { FunctionButton, InputField } from "@knime/components";
import LensIcon from "@knime/styles/img/icons/lens.svg";
import { getMetaOrCtrlKey } from "@knime/utils";
/**
 * A function button that toggles a input field that can be used for search/filter queries.
 */
type Props = {
  modelValue: string;
  placeholder?: string;
  dataTestId?: string;
};

withDefaults(defineProps<Props>(), {
  placeholder: "Search",
  // eslint-disable-next-line no-undefined
  dataTestId: undefined,
});

const emit = defineEmits<{
  "update:modelValue": [query: string];
}>();

const inputField = ref<HTMLElement>();
const isInputFieldShown = ref(false);

const toggleInput = async () => {
  if (isInputFieldShown.value) {
    isInputFieldShown.value = false;
    emit("update:modelValue", "");
    return;
  }
  isInputFieldShown.value = true;
  await nextTick();
  inputField.value?.focus();
};

const onKeydown = (event: KeyboardEvent) => {
  if (
    event[getMetaOrCtrlKey()] &&
    event.shiftKey &&
    event.key.toLowerCase() === "f"
  ) {
    toggleInput();
  }
};

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="search-button-wrapper">
    <InputField
      v-if="isInputFieldShown"
      ref="inputField"
      :model-value="modelValue"
      :placeholder="placeholder"
      class="search-button-input"
      spellcheck="false"
      :maxlength="$characterLimits.searchFields"
      @keydown.esc="toggleInput"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <FunctionButton
      class="search-button"
      :data-test-id="dataTestId"
      :active="isInputFieldShown"
      @click="toggleInput"
    >
      <LensIcon />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
.search-button-wrapper {
  display: flex;
  background: var(--search-button-background, transparent);

  & .search-button-input {
    height: 30px;
    margin-right: 5px;
    width: 240px;
  }
}
</style>
