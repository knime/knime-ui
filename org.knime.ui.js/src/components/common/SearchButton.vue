<script setup lang="ts">
import { nextTick, ref, toRef, watch } from "vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import InputField from "webapps-common/ui/components/forms/InputField.vue";
import LensIcon from "webapps-common/ui/assets/img/icons/lens.svg";
/**
 * A function button that toggles a input field that can be used for search/filter queries.
 */
interface Props {
  modelValue: string;
  placeholder?: string;
  showInput?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Search",
  showInput: false,
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

watch(
  toRef(props, "showInput"),
  (show) => {
    if (show && !isInputFieldShown.value) {
      toggleInput();
    }
  },
  { immediate: true },
);
const focus = () => {
  inputField.value?.focus();
};
defineExpose({ focus });
</script>

<template>
  <InputField
    v-if="isInputFieldShown"
    ref="inputField"
    v-bind="$attrs"
    :model-value="modelValue"
    :placeholder="placeholder"
    class="search-button-input"
    @keydown.esc="toggleInput"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <FunctionButton
    class="search-button"
    :active="isInputFieldShown"
    @click="toggleInput"
  >
    <LensIcon />
  </FunctionButton>
</template>

<style lang="postcss" scoped>
.search-button-input {
  height: 30px;
  margin-right: 5px;
  min-width: 120px;
  max-width: 350px;
}
</style>
