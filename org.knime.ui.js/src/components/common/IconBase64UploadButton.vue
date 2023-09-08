<script setup lang="ts">
import { ref } from "vue";
import Button from "webapps-common/ui/components/Button.vue";

// eslint-disable-next-line no-magic-numbers
const maxFileSize = 1024 * 50; // 50kb

const file2Base64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString() || "");
    reader.onerror = (error) => reject(error);
  });
};

interface Props {
  modelValue: string | undefined; // base64 encoded image
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", icon: string): void;
}>();

const preview = ref(props.modelValue);

const input = ref<HTMLElement>(null);

const triggerInput = () => {
  input.value.click();
};

const onChange = async (e) => {
  if (!e.target) {
    return null;
  }
  let file = e.target.files[0];

  if (!file) {
    return null;
  }

  if (file.size > maxFileSize) {
    return null;
  }

  // TOOD: handle errors?
  const base64 = await file2Base64(file);

  preview.value = base64;
  emit("update:modelValue", base64);

  return null;
};
</script>

<template>
  <div class="icon-uploader">
    <Button with-border compact @click="triggerInput"> Select file </Button>
    <input ref="input" type="file" accept="image/png" @change="onChange" />
    <img v-if="preview" :src="preview" alt="icon preview" class="preview" />
  </div>
</template>

<style scoped lang="postcss">
.icon-uploader {
  display: flex;

  & .preview {
    width: 16px;
    height: 16px;
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
