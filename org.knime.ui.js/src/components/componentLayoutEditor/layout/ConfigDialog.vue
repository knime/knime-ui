<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

import { InputField, Label, ValueSwitch } from "@knime/components";

import { useLayoutEditorStore } from "@/store/layoutEditor/layoutEditor";
import type { ComponentLayoutView } from "@/store/layoutEditor/types";

interface Props {
  item: ComponentLayoutView;
}

const props = defineProps<Props>();
const emit = defineEmits(["close"]);

const layoutEditorStore = useLayoutEditorStore();

const initialItemConfig = {
  resizeMethod: props.item.resizeMethod,
  minWidth: props.item.minWidth,
  maxWidth: props.item.maxWidth,
  minHeight: props.item.minHeight,
  maxHeight: props.item.maxHeight,
};
const initialResizeMode = initialItemConfig.resizeMethod?.includes(
  "aspectRatio",
)
  ? "aspectRatio"
  : "auto";

const itemConfig = ref(initialItemConfig);
const resizeMode = ref(initialResizeMode);

const handleKeyUp = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    emit("close");
  }
};

onMounted(() => {
  window.addEventListener("keyup", handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener("keyup", handleKeyUp);
});

watch(resizeMode, (newResizeMode) => {
  switch (newResizeMode) {
    case "aspectRatio":
      itemConfig.value.resizeMethod = "aspectRatio16by9";

      // aspect ratio currently doesn't support min/max sizes
      itemConfig.value.minWidth = null;
      itemConfig.value.maxWidth = null;
      itemConfig.value.minHeight = null;
      itemConfig.value.maxHeight = null;

      break;
    case "auto":
      itemConfig.value.resizeMethod = "auto";
      break;
  }
});

watch(itemConfig, () => {
  layoutEditorStore.updateContentItemConfig({
    item: props.item,
    config: itemConfig.value,
  });
});
</script>

<template>
  <div class="config-dialog">
    <div class="row">
      <ValueSwitch
        v-model="resizeMode"
        :possible-values="[
          { id: 'aspectRatio', text: 'Aspect ratio' },
          { id: 'auto', text: 'Auto' },
        ]"
      />

      <ValueSwitch
        v-if="resizeMode === 'aspectRatio'"
        v-model="itemConfig.resizeMethod"
        :possible-values="[
          { id: 'aspectRatio16by9', text: '16:9' },
          { id: 'aspectRatio4by3', text: '4:3' },
          { id: 'aspectRatio1by1', text: 'square' },
        ]"
      />
    </div>

    <small v-if="resizeMode === 'auto'">
      Height dynamically calculated depending on content.
    </small>

    <template v-if="resizeMode === 'auto'">
      <Label text="Min Width">
        <InputField
          v-model="itemConfig.minWidth"
          type="number"
          step="1"
          min="0"
        >
          <template #iconRight>
            <span>px</span>
          </template>
        </InputField>
      </Label>

      <Label text="Max Width">
        <InputField
          v-model="itemConfig.maxWidth"
          type="number"
          step="1"
          min="0"
        >
          <template #iconRight>
            <span>px</span>
          </template>
        </InputField>
      </Label>

      <Label text="Min Height">
        <InputField
          v-model="itemConfig.minHeight"
          type="number"
          step="1"
          min="0"
        >
          <template #iconRight>
            <span>px</span>
          </template>
        </InputField>
      </Label>

      <Label text="Max Height">
        <InputField
          v-model="itemConfig.maxHeight"
          type="number"
          step="1"
          min="0"
        >
          <template #iconRight>
            <span>px</span>
          </template>
        </InputField>
      </Label>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.config-dialog {
  background: var(--knime-porcelain);
  padding: var(--space-8);
  width: 275px;
  z-index: 100;
}

.row {
  display: flex;
}
</style>
