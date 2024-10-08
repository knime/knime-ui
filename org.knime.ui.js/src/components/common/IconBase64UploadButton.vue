<script setup lang="ts">
import { ref, toRefs, watch } from "vue";

import { Button } from "@knime/components";

import { getToastsProvider } from "@/plugins/toasts";

// eslint-disable-next-line no-magic-numbers
const maxFileSize = 1024 * 250; // 50kb

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string) ?? "");
    reader.onerror = (error) => reject(error);
  });
};

interface Props {
  modelValue: string | null; // base64 encoded image
}

const props = defineProps<Props>();

const $toast = getToastsProvider();

const emit = defineEmits<{
  (e: "update:modelValue", icon: string): void;
}>();

const input = ref<HTMLInputElement | null>(null);

const triggerInput = () => {
  input.value?.click();
};

const onChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target) {
    return;
  }

  const [file] = target.files as FileList;
  if (!file) {
    return;
  }

  if (file.size > maxFileSize) {
    $toast.show({
      type: "error",
      headline: "Invalid icon",
      message: `Please choose a smaller file, this one exceeds the maximum file Size of ${
        // eslint-disable-next-line no-magic-numbers
        maxFileSize / 1024
      }kb`,
    });
    return;
  }

  const base64 = await fileToBase64(file);

  emit("update:modelValue", base64);
};

const { modelValue } = toRefs(props);
watch(modelValue, () => {
  if (input.value) {
    input.value.value = "";
  }
});
</script>

<template>
  <div class="icon-uploader">
    <Button with-border compact @click="triggerInput"> Select file </Button>
    <input ref="input" type="file" accept="image/png" @change="onChange" />
    <img
      v-if="modelValue"
      :src="modelValue"
      alt="icon preview"
      class="preview"
    />
  </div>
</template>

<style scoped lang="postcss">
.icon-uploader {
  display: flex;

  & .preview {
    width: 16px;
    height: 16px;
    align-self: center;
    margin-left: 10px;
  }

  & input {
    user-select: none;
    display: flex;
    opacity: 0;
    position: absolute;
    z-index: -1;
  }
}
</style>
